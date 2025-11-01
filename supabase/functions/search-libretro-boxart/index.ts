import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { gameName, platformName } = await req.json();
    console.log('Searching for boxart:', { gameName, platformName });

    if (!gameName) {
      return new Response(
        JSON.stringify({ error: 'Game name is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Map platform names to libretro-thumbnails system names
    const platformMapping: Record<string, string> = {
      'Game Boy Advance': 'Nintendo_-_Game_Boy_Advance',
      'Nintendo 3DS': 'Nintendo_-_Nintendo_3DS',
      'Nintendo DS': 'Nintendo_-_Nintendo_DS',
      'Nintendo Switch': 'Nintendo_-_Nintendo_Switch',
      'PlayStation': 'Sony_-_PlayStation',
      'PlayStation 2': 'Sony_-_PlayStation_2',
      'PlayStation 3': 'Sony_-_PlayStation_3',
      'PlayStation 4': 'Sony_-_PlayStation_4',
      'PlayStation 5': 'Sony_-_PlayStation_5',
      'PlayStation Portable': 'Sony_-_PlayStation_Portable',
      'PlayStation Vita': 'Sony_-_PlayStation_Vita',
      'Xbox': 'Microsoft_-_Xbox',
      'Xbox 360': 'Microsoft_-_Xbox_360',
      'Xbox One': 'Microsoft_-_Xbox_One',
      'Wii': 'Nintendo_-_Wii',
      'Wii U': 'Nintendo_-_Wii_U',
      'GameCube': 'Nintendo_-_GameCube',
      'N64': 'Nintendo_-_Nintendo_64',
      'SNES': 'Nintendo_-_Super_Nintendo_Entertainment_System',
      'NES': 'Nintendo_-_Nintendo_Entertainment_System',
      'Sega Genesis': 'Sega_-_Mega_Drive_-_Genesis',
      'Sega Dreamcast': 'Sega_-_Dreamcast',
      'PC': null, // PC doesn't have libretro thumbnails
    };

    const systemName = platformName ? platformMapping[platformName] : null;
    console.log('Platform mapping:', { platformName, systemName });

    if (!systemName) {
      console.log('Platform not supported:', platformName);
      return new Response(
        JSON.stringify({ 
          success: true,
          results: [],
          message: 'Platform not supported or not mapped for libretro-thumbnails'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Search for the game in the Named_Boxarts folder
    const baseUrl = `https://raw.githubusercontent.com/libretro-thumbnails/libretro-thumbnails/master/${systemName}/Named_Boxarts`;
    
    // Try to find exact match first
    const cleanGameName = gameName.trim();
    const possibleFilenames = [
      `${cleanGameName}.png`,
      `${cleanGameName} (USA).png`,
      `${cleanGameName} (Europe).png`,
      `${cleanGameName} (Japan).png`,
      `${cleanGameName} (World).png`,
    ];

    const results = [];
    
    for (const filename of possibleFilenames) {
      const imageUrl = `${baseUrl}/${encodeURIComponent(filename)}`;
      
      try {
        // Check if the image exists
        const response = await fetch(imageUrl, { method: 'HEAD' });
        console.log(`Checking ${filename}: ${response.status}`);
        if (response.ok) {
          console.log(`Found match: ${filename}`);
          results.push({
            filename,
            url: imageUrl,
            system: systemName.replace(/_/g, ' '),
          });
        }
      } catch (error) {
        // Continue to next filename
        console.log(`Image not found: ${filename}`, error);
      }
    }

    // If no exact matches, try to fetch the directory listing
    if (results.length === 0) {
      console.log('No exact matches, trying directory listing...');
      // GitHub API to list files in directory
      const apiUrl = `https://api.github.com/repos/libretro-thumbnails/libretro-thumbnails/contents/${systemName}/Named_Boxarts`;
      
      try {
        const response = await fetch(apiUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Supabase-Function',
          },
        });

        console.log(`GitHub API response: ${response.status}`);

        if (response.ok) {
          const files = await response.json();
          console.log(`Found ${files.length} files in directory`);
          
          // Filter files that match the game name (case insensitive)
          const searchTerm = cleanGameName.toLowerCase();
          const matchingFiles = files
            .filter((file: any) => 
              file.name.toLowerCase().includes(searchTerm) && 
              file.name.endsWith('.png')
            )
            .slice(0, 10) // Limit to 10 results
            .map((file: any) => ({
              filename: file.name,
              url: file.download_url,
              system: systemName.replace(/_/g, ' '),
            }));

          console.log(`Found ${matchingFiles.length} matching files`);
          results.push(...matchingFiles);
        } else {
          console.error(`GitHub API error: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Error details:', errorText);
        }
      } catch (error) {
        console.error('Error fetching directory listing:', error);
      }
    }

    console.log(`Returning ${results.length} results`);
    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        searchTerm: gameName,
        platform: platformName,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
