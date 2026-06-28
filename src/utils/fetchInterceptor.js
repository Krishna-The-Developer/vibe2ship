export function installFetchInterceptor() {
  if (typeof window === 'undefined') return;

  try {
    const originalFetch = window.fetch;
    if (!originalFetch) {
      console.warn('Original window.fetch is not defined.');
      return;
    }

    const customFetch = function(input, init) {
      try {
        if (typeof input === 'string' && input.startsWith('http://localhost:8000')) {
          if (!window.location.hostname.includes('localhost')) {
            input = input.replace('http://localhost:8000', window.location.origin);
          }
        }
      } catch (err) {
        console.error('Error in fetch interceptor URL rewriting:', err);
      }
      return originalFetch(input, init);
    };

    // Safely override window.fetch using Object.defineProperty to bypass getter-only constraint
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true,
      enumerable: true
    });

    console.log('Safe fetch interceptor installed successfully.');
  } catch (error) {
    console.error('Failed to install fetch interceptor via Object.defineProperty:', error);
    
    // Fallback attempt using safe descriptor properties
    try {
      const originalFetch = window.fetch;
      const customFallbackFetch = function(input, init) {
        if (typeof input === 'string' && input.startsWith('http://localhost:8000') && !window.location.hostname.includes('localhost')) {
          input = input.replace('http://localhost:8000', window.location.origin);
        }
        return originalFetch(input, init);
      };
      // Avoiding window.fetch = assignments directly to prevent modern browser getter errors
      Object.defineProperty(window, 'fetch', { value: customFallbackFetch, writable: true });
    } catch (fallbackError) {
      console.error('Fallback fetch property modification failed:', fallbackError);
    }
  }
}
