export const AddAudioElementsForAudioLinks = (document: Document) => {
  const processAudioLinks = () => {
    // Try multiple selector variations to find the audio links
    let audioLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*=".mp3"], a[href*=".wav"]');

    if (audioLinks.length === 0) return false;

    // Remove duplicates based on href
    const uniqueLinks = new Map<string, HTMLAnchorElement>();
    audioLinks.forEach((link) => {
      if (!uniqueLinks.has(link.href)) {
        uniqueLinks.set(link.href, link);
      }
    });

    // Add audio elements for each unique link
    uniqueLinks.forEach((audioLink) => {
      const parentElement = audioLink.parentElement;
      if (!parentElement) return;

      // Check if audio element already exists
      if (parentElement.querySelector('audio')) return;

      parentElement.style.display = "flex";
      parentElement.style.flexDirection = "column";

      const audioElement = document.createElement("audio");
      audioElement.controls = true;

      const sourceElement = document.createElement("source");
      sourceElement.src = audioLink.href;

      // Set the correct MIME type based on file extension
      if (audioLink.href.toLowerCase().includes('.wav')) {
        sourceElement.type = "audio/wav";
      } else {
        sourceElement.type = "audio/mpeg";
      }

      audioElement.appendChild(sourceElement);
      parentElement.appendChild(audioElement);
    });

    return true;
  };

  // Try processing immediately and retry if needed
  const tryProcess = () => {
    const success = processAudioLinks();

    if (!success) {
      setTimeout(() => {
        processAudioLinks();
      }, 500);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryProcess);
  } else {
    tryProcess();
  }
}
