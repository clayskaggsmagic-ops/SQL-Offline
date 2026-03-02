export async function runPython(code: string, functionName: string, testCaseInput: string, expectedOutput: string): Promise<any> {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    throw new Error("Pyodide cannot be run on the server. Please run this client-side.");
  }

  let pyodide = (window as any).pyodide;
  if (!pyodide) {
      pyodide = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
      });
      (window as any).pyodide = pyodide;
  }

  try {
    await pyodide.runPythonAsync(`
import sys
import io
import json

sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

try:
    # 1. Execute user code
    ${code.replace(/^/gm, '    ')}

    # 2. Extract user function
    user_func = locals().get('${functionName}')

    if user_func:
        # 3. Parse inputs and expected outputs
        test_inputs = json.loads('${testCaseInput.replace(/'/g, "\\'")}')
        expected = json.loads('${expectedOutput.replace(/'/g, "\\'")}')

        # 4. Call user function
        # Support variable positional/keyword args depending on test case structure
        if isinstance(test_inputs, dict):
             result = user_func(**test_inputs)
        elif isinstance(test_inputs, list):
             result = user_func(*test_inputs)
        else:
             result = user_func(test_inputs)

        # 5. Check Result
        passed = (result == expected)
        sys.stdout.write(json.dumps({
            "passed": passed,
            "actual": result,
            "expected": expected,
            "output": sys.stdout.getvalue()
        }))
    else:
        sys.stderr.write(f"Function '${functionName}' not found in user code.")

except Exception as e:
    sys.stderr.write(str(e))
finally:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
    `);

    // We expect the standard out to contain the JSON payload, or stderr to contain an error
    const outStr = await pyodide.runPythonAsync("sys.stdout.getvalue()");
    const errStr = await pyodide.runPythonAsync("sys.stderr.getvalue()");

    if (errStr) {
      return { success: false, error: errStr };
    }

    // In our wrapper, the last line of stdout should be our JSON result.
    // If user print() statements were executed, they might be mixed in.
    // We should probably just return the output for now or parse it robustly.
    return { success: true, result: outStr };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
