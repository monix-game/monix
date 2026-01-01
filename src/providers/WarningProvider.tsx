import React, { useEffect } from 'react';

// Flag to track if console is open
let isConsoleOpen = false;
let messageInterval: ReturnType<typeof setInterval> | null = null;

// Function to display the warning message
function displayWarning() {
  console.log(
    '%c🚨 DANGER: STOP RIGHT NOW! 🚨',
    'color: red; font-size: 20px; font-weight: bold;'
  );
  console.log(
    '%cYou have an 11/10 chance you are being SCAMMED if you paste anything here!',
    'color: orange; font-size: 16px; font-weight: bold;'
  );
  console.log(
    '%cPasting code someone told you to use will get your account COMPROMISED and your stuff STOLEN.',
    'color: yellow; background: black; font-size: 14px;'
  );
}

// Function to start repeating the message
function startRepeatingMessage() {
  if (!messageInterval) {
    // Clear console for emphasis (optional, may not work in all browsers)
    console.clear();
    // Display message immediately
    displayWarning();
    // Repeat every 1 second
    messageInterval = setInterval(displayWarning, 1000);
  }
}

// Function to stop repeating the message
function stopRepeatingMessage() {
  if (messageInterval) {
    clearInterval(messageInterval);
    messageInterval = null;
  }
}

// Console detection technique using a getter
const consoleDetector: Record<string, unknown> = {};
Object.defineProperty(consoleDetector, 'isOpen', {
  get: function () {
    isConsoleOpen = true;
    startRepeatingMessage();
    return true;
  },
  configurable: true
});

// Trigger console detection
function checkConsole() {
  // This will invoke the getter when the console is open
  console.log(consoleDetector.isOpen);
}

interface WarningProviderProps {
  children: React.ReactNode;
}

export const WarningProvider: React.FC<WarningProviderProps> = ({ children }) => {
  useEffect(() => {
    // Run check periodically
    const checkConsoleInterval = setInterval(checkConsole, 1000);

    // Alternative detection using size differences (works in some browsers)
    const threshold = 100; // Pixel threshold for size change
    const check = () => {
      const width = window.outerWidth - window.innerWidth;
      const height = window.outerHeight - window.innerHeight;
      if (width > threshold || height > threshold) {
        if (!isConsoleOpen) {
          isConsoleOpen = true;
          startRepeatingMessage();
        }
      } else {
        if (isConsoleOpen) {
          isConsoleOpen = false;
          stopRepeatingMessage();
        }
      }
    };
    const detectConsoleInterval = setInterval(check, 1000);

    // Cleanup intervals on unmount
    return () => {
      clearInterval(checkConsoleInterval);
      clearInterval(detectConsoleInterval);
      stopRepeatingMessage();
    };
  }, []);

  return <>{children}</>;
};
