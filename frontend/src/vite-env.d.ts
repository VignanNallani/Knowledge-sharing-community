/// <reference types="vite/client" />

declare module '*.jsx' {
  import React from 'react';
  const Component: React.FC;
  export default Component;
}

declare module '*.js' {
  const content: any;
  export default content;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
