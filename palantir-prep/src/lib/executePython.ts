export interface TestCaseResult {
  id: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  hidden: boolean;
}

export async function runPython(
  code: string,
  testCases: Array<{ id: number; input_data: string; expected_output: string; is_hidden: boolean }> = []
): Promise<{ output: string; testResults: TestCaseResult[] }> {
  const isServer = typeof window === 'undefined';
  if (isServer) {
    throw new Error("Pyodide cannot be run on the server. Please run this client-side.");
  }

  let pyodide = (window as any).pyodide;
  if (!pyodide) {
    if (!(window as any).loadPyodide) {
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
    // Reset stdout/stderr
    await pyodide.runPythonAsync(`
import sys, io, json
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
    `);

    // Execute the user's code to define their function(s)
    await pyodide.runPythonAsync(code);

    const outStr = await pyodide.runPythonAsync("sys.stdout.getvalue()");
    const errStr = await pyodide.runPythonAsync("sys.stderr.getvalue()");

    // Restore stdout/stderr
    await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
    `);

    if (errStr) {
      throw new Error(errStr);
    }

    // If no test cases, just return the stdout output
    if (testCases.length === 0) {
      return { output: outStr, testResults: [] };
    }

    // Detect function name from the user's code (first `def <name>(...)`)
    const funcMatch = code.match(/def\s+(\w+)\s*\(/);
    if (!funcMatch) {
      throw new Error("Could not detect function name. Make sure your code defines a function using `def function_name(...):`");
    }
    const funcName = funcMatch[1];

    // Run each test case
    const testResults: TestCaseResult[] = [];

    for (const tc of testCases) {
      try {
        // Parse the input_data JSON to get the function arguments
        const inputObj = JSON.parse(tc.input_data);
        const argNames = Object.keys(inputObj);
        const argValues = argNames.map(k => JSON.stringify(inputObj[k]));

        // Build the Python call: func_name(arg1, arg2, ...)
        const callArgs = argValues.join(', ');
        const testCode = `
import json
_test_result = ${funcName}(${callArgs})
# Convert to JSON-compatible string for comparison
if isinstance(_test_result, bool):
    _test_output = json.dumps(_test_result)
elif isinstance(_test_result, (list, dict, tuple)):
    _test_output = json.dumps(_test_result)
else:
    _test_output = str(_test_result)
_test_output
`;
        const result = await pyodide.runPythonAsync(testCode);
        const actualStr = String(result);

        // Normalize for comparison: strip whitespace, lowercase booleans
        const normalizeOutput = (s: string) => s.trim().replace(/'/g, '"').toLowerCase();
        const passed = normalizeOutput(actualStr) === normalizeOutput(tc.expected_output);

        testResults.push({
          id: tc.id,
          input: tc.is_hidden ? '(hidden)' : tc.input_data,
          expected: tc.is_hidden ? '(hidden)' : tc.expected_output,
          actual: tc.is_hidden ? (passed ? '(correct)' : '(incorrect)') : actualStr,
          passed,
          hidden: tc.is_hidden,
        });
      } catch (testErr: any) {
        testResults.push({
          id: tc.id,
          input: tc.is_hidden ? '(hidden)' : tc.input_data,
          expected: tc.is_hidden ? '(hidden)' : tc.expected_output,
          actual: tc.is_hidden ? '(error)' : `Error: ${testErr.message}`,
          passed: false,
          hidden: tc.is_hidden,
        });
      }
    }

    return { output: outStr, testResults };
  } catch (error: any) {
    // Restore stdout/stderr on error
    try {
      await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
      `);
    } catch (e) { }

    throw new Error(error.message);
  }
}
