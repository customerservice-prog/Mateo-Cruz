import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const TMP_DIR = process.env.TMP_DIR || '/tmp/mateo-cruz';

// Ensure temp directory exists
async function ensureTmpDir(subDir: string): Promise<string> {
  const dir = join(TMP_DIR, subDir);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export const ffmpeg = {
  /**
   * Apply Ken Burns zoom effect to a still image to create a cinematic video clip.
   * This is the core of the MVP — making stills feel alive.
   */
  async kenBurnsFromImage(imagePath: string, outputPath: string, durationSeconds: number, motionStyle: 'zoom-in' | 'zoom-out' | 'pan-right' | 'pan-left' | 'static' = 'zoom-in'): Promise<string> {
    const fps = 30;
    const totalFrames = durationSeconds * fps;

    let zoomFilter = '';
    switch (motionStyle) {
      case 'zoom-in':
        zoomFilter = `zoompan=z='min(zoom+0.0012,1.15)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080`;
        break;
      case 'zoom-out':
        zoomFilter = `zoompan=z='if(lte(zoom,1.0),1.15,max(1.001,zoom-0.0012))':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080`;
        break;
      case 'pan-right':
        zoomFilter = `zoompan=z='1.08':d=${totalFrames}:x='min(iw*0.05+(iw*0.1/${totalFrames})*on, iw*0.15)':y='ih/2-(ih/zoom/2)':s=1920x1080`;
        break;
      case 'pan-left':
        zoomFilter = `zoompan=z='1.08':d=${totalFrames}:x='max(iw*0.15-(iw*0.1/${totalFrames})*on, 0)':y='ih/2-(ih/zoom/2)':s=1920x1080`;
        break;
      default:
        zoomFilter = `zoompan=z='1.0':d=${totalFrames}:s=1920x1080`;
    }

    const cmd = `ffmpeg -y -loop 1 -i "${imagePath}" -vf "${zoomFilter},fps=${fps}" -t ${durationSeconds} -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
    await execAsync(cmd);
    return outputPath;
  },

  /**
   * Concatenate multiple video clips into one.
   */
  async concatVideos(videoPaths: string[], outputPath: string): Promise<string> {
    const dir = await ensureTmpDir('concat');
    const listFile = join(dir, `list_${Date.now()}.txt`);
    const lines = videoPaths.map(p => `file '${p}'`).join('\n');
    await fs.writeFile(listFile, lines, 'utf8');

    const cmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
    await execAsync(cmd);
    await fs.unlink(listFile);
    return outputPath;
  },

  /**
   * Mix voiceover + background music and overlay on video.
   * Music is ducked to ~20% volume so voiceover stays clear.
   */
  async mixFinalVideo(params: {
    videoPath: string;
    voicePath: string;
    subtitlesPath: string;
    outputPath: string;
    musicPath?: string;
  }): Promise<string> {
    const { videoPath, voicePath, subtitlesPath, outputPath, musicPath } = params;

    let audioFilter = '';
    let inputArgs = `-i "${videoPath}" -i "${voicePath}"`;
    
    if (musicPath) {
      inputArgs += ` -i "${musicPath}"`;
      // Voice at 100%, music at 18%, looped to match video length
      audioFilter = `-filter_complex "[2:a]volume=0.18,aloop=loop=-1:size=2e+09[music];[1:a][music]amix=inputs=2:duration=first:dropout_transition=3[audio]" -map 0:v -map "[audio]"`;
    } else {
      audioFilter = `-map 0:v -map 1:a`;
    }

    // Burn subtitles + apply cinematic grade
    const videoFilter = `-vf "subtitles=${subtitlesPath}:force_style='FontName=Arial,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,Bold=1,Outline=2,Shadow=1,Alignment=2',eq=contrast=1.15:brightness=-0.03:saturation=0.85"`;

    const cmd = `ffmpeg -y ${inputArgs} ${videoFilter} ${audioFilter} -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 192k -movflags +faststart "${outputPath}"`;
    await execAsync(cmd, { maxBuffer: 1024 * 1024 * 50 });
    return outputPath;
  },

  /**
   * Add film grain and cinematic vignette to final video.
   * This is the "invisible VFX" that makes it feel like real footage.
   */
  async addCinematicFinish(inputPath: string, outputPath: string): Promise<string> {
    const cmd = `ffmpeg -y -i "${inputPath}" -vf "noise=alls=8:allf=t+u,vignette=PI/5" -c:v libx264 -preset fast -crf 20 -c:a copy "${outputPath}"`;
    await execAsync(cmd);
    return outputPath;
  },

  /**
   * Get video duration in seconds.
   */
  async getDuration(filePath: string): Promise<number> {
    const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
    return parseFloat(stdout.trim());
  },

  /**
   * Download a file from URL to local temp path.
   */
  async downloadToTmp(url: string, filename: string): Promise<string> {
    const dir = await ensureTmpDir('downloads');
    const outputPath = join(dir, filename);
    await execAsync(`curl -s -o "${outputPath}" "${url}"`);
    return outputPath;
  },

  /**
   * Clean up temp files for a project.
   */
  async cleanup(projectId: string): Promise<void> {
    const dir = join(TMP_DIR, projectId);
    await fs.rm(dir, { recursive: true, force: true });
  },
};
