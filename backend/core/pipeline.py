from checks.syntax_check import check_syntax
from checks.security_check import check_security
from checks.runtime_check import check_runtime_risks
from checks.readiness_check import check_optimization_readiness
from optimizer.rule_optimizer import optimize_code


def process_code(code: str):
    result = {
        "status": None,
        "errors": [],
        "warnings": [],
        "optimized_code": None
    }

    # 1. Syntax check (hard stop)
    syntax_error = check_syntax(code)
    if syntax_error:
        result["status"] = "error"
        result["errors"].append(syntax_error)
        return result

    # 2. Security check (hard stop)
    security_errors = check_security(code)
    if security_errors:
        result["status"] = "error"
        result["errors"].extend(security_errors)
        return result

    # 3. Runtime warnings (non-fatal)
    runtime_warnings = check_runtime_risks(code)
    result["warnings"].extend(runtime_warnings)

    # 4. Optimization readiness (non-fatal)
    if not check_optimization_readiness(code):
        result["warnings"].append(
            "Code has limited structures for Level-1 optimization"
        )

    # 5. Optimization
    optimized_code = optimize_code(code)

    result["status"] = "success"
    result["optimized_code"] = optimized_code

    return result
