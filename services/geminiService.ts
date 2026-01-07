
import { OptimizationResult, OptimizationLevel } from "../types";

/**
 * LEVEL 2 OPTIMIZER (Simulated AI)
 * This function mimics what an AI would do. It looks for specific 
 * "patterns" in your code and suggests smarter Python ways to write them.
 */
export const optimizeWithAI = async (userCode: string): Promise<OptimizationResult> => {
  // We wait for 1.8 seconds to simulate the AI "thinking"
  await new Promise(resolve => setTimeout(resolve, 1800));

  const codeLower = userCode.toLowerCase();
  
  // These are our "Triggers". We look for these keywords to decide which "Demo" result to show.
  const hasFactorialLogic = codeLower.includes('factorial');
  const hasListDeduplication = codeLower.includes('not in') && codeLower.includes('append');

  // Default values if no specific patterns are found
  let finalOptimizedCode = userCode;
  let textExplanation = "I analyzed your code's structure and improved general readability and variable scoping.";
  let estimatedPerformanceGain = "1.2x";
  let specificChanges: any[] = [];

  // SCENARIO A: The user is trying to find unique items in a list
  if (hasListDeduplication) {
    finalOptimizedCode = `# AI Optimized: Switched from a slow loop to a fast Set conversion\ndata = [1, 2, 2, 3, 4, 4, 5]\nunique_data = list(set(data))`;
    textExplanation = "You were using a loop with 'if item not in list', which gets very slow as your data grows (O(n²)). Using Python's native 'set()' function is much faster (O(n)) because it uses hash-mapping.";
    estimatedPerformanceGain = "8.5x";
    specificChanges = [{ line: 4, description: "Replaced manual deduplication loop with set() constructor.", type: 'replacement' }];
  } 
  
  // SCENARIO B: The user is writing a custom factorial function
  else if (hasFactorialLogic) {
    finalOptimizedCode = `import math\n\ndef factorial(n):\n    # AI Optimized: Using math.factorial (written in C) instead of pure Python\n    return math.factorial(n)`;
    textExplanation = "Custom mathematical functions in Python are often slower than the 'math' library, which is written in pre-compiled C code. Swapping to 'math.factorial' provides a massive speed boost.";
    estimatedPerformanceGain = "45.0x";
    specificChanges = [{ line: 1, description: "Imported the 'math' library for native speed.", type: 'improvement' }];
  }

  // Return the final result object
  return {
    originalCode: userCode,
    optimizedCode: finalOptimizedCode,
    explanation: textExplanation,
    metrics: {
      cyclomaticComplexity: 1,
      linesOfCode: finalOptimizedCode.split('\n').length,
      maintainabilityIndex: 98,
      estimatedSpeedup: estimatedPerformanceGain
    },
    changes: specificChanges.length > 0 ? specificChanges : [{ line: 1, description: "General refactoring for PEP8 compliance.", type: 'improvement' }],
    level: OptimizationLevel.LEVEL_2,
    timestamp: Date.now()
  };
};
