import ast

def check_optimization_readiness(code):
    """
    Checks whether code contains structures suitable for Level-1 optimization.
    Returns True or False.
    """
    tree = ast.parse(code)

    for node in ast.walk(tree):
        if isinstance(node, (ast.For, ast.While, ast.If, ast.BinOp)):
            return True  # Optimizable structure found

    return False
