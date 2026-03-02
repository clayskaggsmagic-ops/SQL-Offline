export async function runPython(code: string, testCases: any[] = []): Promise<any> {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    throw new Error("Pyodide cannot be run on the server. Please run this client-side.");
  }

  let pyodide = (window as any).pyodide;
  if (!pyodide) {
      if (!(window as any).loadPyodide) {
          // Dynamically load pyodide script if not present
          await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
              script.onload = () => resolve();
              script.onerror = () => reject(new Error("Failed to load Pyodide script"));
              document.head.appendChild(script);
          });
      }

      pyodide = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
      });
      (window as any).pyodide = pyodide;
  }

  try {
    // Redirect stdout and stderr to capture print statements and errors
    await pyodide.runPythonAsync(`
import sys
import io

sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
    `);

    // Execute the user's code
    await pyodide.runPythonAsync(code);

    // For now, we are just executing the code and returning the output.
    // In a more robust system, we would run the specific test cases against the defined function.

    const outStr = await pyodide.runPythonAsync("sys.stdout.getvalue()");
    const errStr = await pyodide.runPythonAsync("sys.stderr.getvalue()");

    // Restore stdout and stderr
    await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
    `);

    if (errStr) {
      throw new Error(errStr);
    }

    return { success: true, output: outStr };

  } catch (error: any) {
    // Ensure we restore stdout/stderr even on error
    try {
        await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
        `);
    } catch(e) {}

    throw new Error(error.message);
  }
}
