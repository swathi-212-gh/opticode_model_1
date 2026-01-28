import ast

FORBIDDEN_IMPORTS = {"os", "sys", "subprocess"}
FORBIDDEN_FUNCTIONS = {"eval", "exec", "open"}

def check_security(code):
    """
    Scans the AST to detect unsafe imports or function calls.
    Returns list of security errors.
    """
    errors = []
    tree = ast.parse(code)

    for node in ast.walk(tree):

        # Check imports
        if isinstance(node, ast.Import):
            for name in node.names:
                if name.name in FORBIDDEN_IMPORTS:
                    errors.append(f"Forbidden import detected: {name.name}")

        # Check function calls
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in FORBIDDEN_FUNCTIONS:
                    errors.append(f"Forbidden function used: {node.func.id}")

    return errors
