import ast

def check_syntax(code):
    """
    Checks whether the submitted code has valid Python syntax.
    Returns None if syntax is correct.
    Returns error message if syntax is wrong.
    """
    try:
        ast.parse(code)
        return None
    except SyntaxError as e:
        return f"Syntax Error: {e}"
