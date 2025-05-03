const { Octokit } = require("@octokit/rest");
const { Base64 } = require("js-base64");
const cloudinaryHelper = require("./utils/cloudinary-helper");

// GitHub repository information
const GITHUB_OWNER = "RyanNovinc"; // Your GitHub username
const GITHUB_REPO = "ClaudeAppBuilder"; // Your repository name
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  
  // Check authentication
  const authHeader = event.headers.authorization;
  let token = null;
  
  if (authHeader) {
    token = authHeader.startsWith("Bearer ") 
      ? authHeader.split(" ")[1]
      : authHeader;
  }
  
  if (!token || token !== ADMIN_TOKEN) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized - Invalid or missing admin token" })
    };
  }

  try {
    // Parse request body
    const data = JSON.parse(event.body);
    
    // Determine operation mode (specific submission or all)
    const { submissionId, forceAll } = data;
    
    // Initialize GitHub API client
    const octokit = new Octokit({
      auth: GITHUB_TOKEN
    });
    
    // Function to find a submission by ID
    async function findSubmission(id) {
      const statusFiles = ['pending-submissions.json', 'approved-submissions.json', 'rejected-submissions.json'];
      
      for (const statusFile of statusFiles) {
        try {
          const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: `data/${statusFile}`
          });
          
          const content = JSON.parse(Base64.decode(fileData.content));
          const submissionIndex = content.findIndex(s => s.id === id);
          
          if (submissionIndex !== -1) {
            return {
              path: `data/${statusFile}`,
              content,
              sha: fileData.sha,
              submission: content[submissionIndex],
              index: submissionIndex
            };
          }
        } catch (error) {
          // If file not found, continue to next file
          if (error.status === 404) {
            continue;
          }
          throw error;
        }
      }
      
      return null; // Not found
    }
    
    // Function to migrate images for a single submission
    async function migrateSubmissionImages(sourceInfo) {
      const submission = sourceInfo.submission;
      let updated = false;
      
      // Skip if no images
      if (!submission.images || !Array.isArray(submission.images)) {
        return { updated: false, submission };
      }
      
      // Check for base64 images that need migration
      const base64Images = submission.images.filter(img => 
        typeof img === 'string' && img.startsWith('data:')
      );
      
      if (base64Images.length === 0 && !forceAll) {
        console.log(`No base64 images to migrate for submission ${submission.id}`);
        return { updated: false, submission };
      }
      
      console.log(`Migrating ${base64Images.length} images for submission ${submission.id}`);
      
      // Upload images to Cloudinary
      try {
        // Create a map to track the original to Cloudinary URL
        const imageMap = new Map();
        
        for (let i = 0; i < submission.images.length; i++) {
          const image = submission.images[i];
          
          // Skip null/empty images or non-base64 images (unless forceAll)
          if (!image || (typeof image !== 'string' || !image.startsWith('data:')) && !forceAll) {
            continue;
          }
          
          // Upload to Cloudinary
          const result = await cloudinaryHelper.uploadImage(
            image, 
            `${submission.id}_${i}`,
            'appfoundry'
          );
          
          // Store the mapping
          imageMap.set(i, result.secure_url);
        }
        
        // Update images in the submission
        if (imageMap.size > 0) {
          const updatedImages = [...submission.images];
          
          // Replace each image with its Cloudinary URL
          for (const [index, url] of imageMap.entries()) {
            updatedImages[index] = url;
          }
          
          // Update the submission in the content array
          sourceInfo.content[sourceInfo.index].images = updatedImages;
          updated = true;
          
          // Save changes to GitHub
          await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: sourceInfo.path,
            message: `Migrate images for submission ${submission.id}`,
            content: Base64.encode(JSON.stringify(sourceInfo.content, null, 2)),
            sha: sourceInfo.sha
          });
          
          // Return the updated submission
          return { 
            updated: true, 
            submission: sourceInfo.content[sourceInfo.index]
          };
        }
      } catch (error) {
        console.error(`Error migrating images for submission ${submission.id}:`, error);
        throw error;
      }
      
      return { updated, submission };
    }
    
    // If we're migrating a specific submission
    if (submissionId) {
      const sourceInfo = await findSubmission(submissionId);
      
      if (!sourceInfo) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: `Submission ${submissionId} not found` })
        };
      }
      
      const result = await migrateSubmissionImages(sourceInfo);
      
      // Update the sync timestamp
      try {
        // Update the last-sync.json file to trigger client syncs
        const timestamp = new Date().toISOString();
        
        try {
          // Get the current file if it exists
          const { data: syncFile } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: 'data/last-sync.json'
          });
          
          // Update it
          await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: 'data/last-sync.json',
            message: `Update sync timestamp: ${timestamp}`,
            content: Base64.encode(JSON.stringify({ lastSync: timestamp })),
            sha: syncFile.sha
          });
        } catch (error) {
          // Create if not exists
          if (error.status === 404) {
            await octokit.repos.createOrUpdateFileContents({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: 'data/last-sync.json',
              message: `Create sync timestamp: ${timestamp}`,
              content: Base64.encode(JSON.stringify({ lastSync: timestamp }))
            });
          } else {
            throw error;
          }
        }
      } catch (syncError) {
        console.warn("Error updating sync timestamp:", syncError);
        // Continue anyway as this is not critical
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          updated: result.updated,
          message: result.updated 
            ? "Successfully migrated images to Cloudinary" 
            : "No images needed migration",
          submission: result.submission
        })
      };
    }
    // Migrate all submissions
    else {
      const results = {
        total: 0,
        updated: 0,
        details: []
      };
      
      // Process each status file
      const statusFiles = ['pending-submissions.json', 'approved-submissions.json', 'rejected-submissions.json'];
      
      for (const statusFile of statusFiles) {
        try {
          // Get the file
          const { data: fileData } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: `data/${statusFile}`
          });
          
          // Decode and parse content
          const content = JSON.parse(Base64.decode(fileData.content));
          let contentUpdated = false;
          
          results.total += content.length;
          
          // Process each submission
          for (let i = 0; i < content.length; i++) {
            const submission = content[i];
            
            // Skip if no images
            if (!submission.images || !Array.isArray(submission.images)) {
              continue;
            }
            
            // Check for base64 images that need migration
            const base64Images = submission.images.filter(img => 
              typeof img === 'string' && img.startsWith('data:')
            );
            
            if (base64Images.length === 0 && !forceAll) {
              continue;
            }
            
            console.log(`Migrating ${base64Images.length} images for submission ${submission.id}`);
            
            try {
              // Create a map to track the original to Cloudinary URL
              const imageMap = new Map();
              
              for (let j = 0; j < submission.images.length; j++) {
                const image = submission.images[j];
                
                // Skip null/empty images or non-base64 images (unless forceAll)
                if (!image || (typeof image !== 'string' || !image.startsWith('data:')) && !forceAll) {
                  continue;
                }
                
                // Upload to Cloudinary
                const result = await cloudinaryHelper.uploadImage(
                  image, 
                  `${submission.id}_${j}`,
                  'appfoundry'
                );
                
                // Store the mapping
                imageMap.set(j, result.secure_url);
              }
              
              // Update images in the submission
              if (imageMap.size > 0) {
                const updatedImages = [...submission.images];
                
                // Replace each image with its Cloudinary URL
                for (const [index, url] of imageMap.entries()) {
                  updatedImages[index] = url;
                }
                
                // Update the submission in the content array
                content[i].images = updatedImages;
                contentUpdated = true;
                results.updated++;
                
                results.details.push({
                  id: submission.id,
                  message: "Successfully migrated images to Cloudinary"
                });
              }
            } catch (error) {
              console.error(`Error migrating images for submission ${submission.id}:`, error);
              results.details.push({
                id: submission.id,
                error: error.message
              });
            }
          }
          
          // Save changes to GitHub if any updates were made
          if (contentUpdated) {
            await octokit.repos.createOrUpdateFileContents({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: `data/${statusFile}`,
              message: `Migrate images for multiple submissions in ${statusFile}`,
              content: Base64.encode(JSON.stringify(content, null, 2)),
              sha: fileData.sha
            });
          }
        } catch (error) {
          // If file not found, continue to next file
          if (error.status === 404) {
            continue;
          }
          
          console.error(`Error processing ${statusFile}:`, error);
          results.details.push({
            file: statusFile,
            error: error.message
          });
        }
      }
      
      // Update the sync timestamp
      try {
        // Update the last-sync.json file to trigger client syncs
        const timestamp = new Date().toISOString();
        
        try {
          // Get the current file if it exists
          const { data: syncFile } = await octokit.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: 'data/last-sync.json'
          });
          
          // Update it
          await octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: 'data/last-sync.json',
            message: `Update sync timestamp: ${timestamp}`,
            content: Base64.encode(JSON.stringify({ lastSync: timestamp })),
            sha: syncFile.sha
          });
        } catch (error) {
          // Create if not exists
          if (error.status === 404) {
            await octokit.repos.createOrUpdateFileContents({
              owner: GITHUB_OWNER,
              repo: GITHUB_REPO,
              path: 'data/last-sync.json',
              message: `Create sync timestamp: ${timestamp}`,
              content: Base64.encode(JSON.stringify({ lastSync: timestamp }))
            });
          } else {
            throw error;
          }
        }
      } catch (syncError) {
        console.warn("Error updating sync timestamp:", syncError);
        // Continue anyway as this is not critical
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          results
        })
      };
    }
  } catch (error) {
    console.error("Error migrating images:", error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An error occurred while migrating images",
        message: error.message
      })
    };
  }
};
