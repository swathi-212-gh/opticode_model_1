import ast

def check_runtime_risks(code):
    """
    Detects possible runtime risks without executing code.
    Returns warnings.
    """
    warnings = []
    tree = ast.parse(code)

    for node in ast.walk(tree):

        # Infinite loop detection
        if isinstance(node, ast.While):
            if isinstance(node.test, ast.Constant) and node.test.value is True:
                warnings.append("Possible infinite loop detected (while True)")

        # Division by zero
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Div):
            if isinstance(node.right, ast.Constant) and node.right.value == 0:
                warnings.append("Possible division by zero detected")

    return warnings
