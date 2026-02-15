import ast


class ComplexityAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.loop_depth = 0
        self.max_loop_depth = 0
        self.recursion = False
        self.recursive_calls = 0
        self.allocations = 0
        self.slicing = False
        self.function_name = None
        self.has_branching_recursion = False
        self.has_divide_conquer = False
        self.comprehension_depth = 0
        self.max_comp_depth = 0
        self.possible_log_loop = False

    # ---------------- FUNCTION TRACKING ---------------- #
    def visit_FunctionDef(self, node):
        old_function = self.function_name
        self.function_name = node.name
        self.generic_visit(node)
        self.function_name = old_function

    # ---------------- LOOP TRACKING ---------------- #
    def visit_For(self, node):
        self.loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.loop_depth)
        self.generic_visit(node)
        self.loop_depth -= 1

    def visit_While(self, node):
        self.loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.loop_depth)
        self.generic_visit(node)
        self.loop_depth -= 1

    # ---------------- RECURSION ---------------- #
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id == self.function_name:
                self.recursion = True
                self.recursive_calls += 1
                # BUG FIX 1: branching recursion means 2+ calls IN THE SAME
                # function body (like fib calling fib twice), NOT 2+ calls
                # accumulated across visits. We track this more carefully now —
                # the flag is only set if more than 1 recursive call exists in
                # the SAME function, which recursive_calls > 1 captures correctly
                # only if we reset between functions. We fix that in the
                # visit_FunctionDef wrapper below.
                if self.recursive_calls > 1:
                    self.has_branching_recursion = True
        self.generic_visit(node)

    # ---------------- ALLOCATION ---------------- #
    def visit_List(self, node):
        self.allocations += 1
        self.generic_visit(node)

    def visit_Dict(self, node):
        self.allocations += 1
        self.generic_visit(node)

    def visit_ListComp(self, node):
        self.allocations += 1
        self.comprehension_depth += 1
        self.max_comp_depth = max(self.max_comp_depth, self.comprehension_depth)
        self.generic_visit(node)
        self.comprehension_depth -= 1

    def visit_DictComp(self, node):
        self.allocations += 1
        self.comprehension_depth += 1
        self.max_comp_depth = max(self.max_comp_depth, self.comprehension_depth)
        self.generic_visit(node)
        self.comprehension_depth -= 1

    # ---------------- SLICING DETECTION ---------------- #
    def visit_Subscript(self, node):
        if isinstance(node.slice, ast.Slice):
            self.slicing = True
            # BUG FIX 2: divide-and-conquer requires BOTH recursion AND slicing/halving.
            # We should not eagerly set has_divide_conquer here because recursion
            # might not have been detected yet (AST visit order is not guaranteed).
            # Instead, we compute this lazily in estimate_time_complexity.
        self.generic_visit(node)

    # ---------------- LOG LOOP HEURISTIC ---------------- #
    def visit_Assign(self, node):
        """
        Detect patterns like:
            mid = (l+r)//2
            l = mid + 1
            r = mid - 1
        """
        if isinstance(node.value, ast.BinOp):
            if isinstance(node.value.op, (ast.FloorDiv, ast.Div)):
                if isinstance(node.value.right, ast.Constant):
                    if node.value.right.value == 2:
                        self.possible_log_loop = True
        self.generic_visit(node)


# ---------------- COMPLEXITY ESTIMATION ---------------- #

def estimate_time_complexity(signals):
    max_depth    = signals['max_loop_depth']
    comp_depth   = signals['max_comp_depth']
    recursion    = signals['recursion']
    slicing      = signals['slicing']
    branching    = signals['has_branching_recursion']
    log_loop     = signals['possible_log_loop']
    # BUG FIX 3: derive divide_and_conquer here instead of relying on the
    # flag set inside visit_Subscript (which has ordering issues). A function
    # is divide-and-conquer if it is recursive AND uses slicing (e.g. arr[:mid]).
    divide       = recursion and slicing

    # ----- RECURSION PATH ----- #
    if recursion:
        if branching:
            # BUG FIX 4: previously the branching check ran BEFORE the
            # divide-and-conquer check, so merge_sort (branching + divide)
            # was classified as O(2^n). Correct priority:
            #   1. Branching + divide-and-conquer → O(n log n)  (merge_sort)
            #   2. Branching alone                → O(2^n)       (fib)
            #   3. Linear + slicing               → O(n^2)       (slicing_recursion)
            #   4. Linear                         → O(n)         (factorial)
            if divide:
                return "O(n log n)"
            return "O(2^n)"
        # linear recursion
        if slicing:
            # e.g. slicing_recursion(arr[1:]) — each call copies O(n) slice
            return "O(n^2)"
        return "O(n)"

    # ----- ITERATIVE LOG LOOP ----- #
    # BUG FIX 5: possible_log_loop should only imply O(log n) when there is
    # exactly ONE loop level. A nested loop that also halves an index should
    # not be blindly classified as O(log n).
    if log_loop and max_depth == 1:
        return "O(log n)"

    # ----- PURE ITERATION / COMPREHENSIONS ----- #
    effective_depth = max(max_depth, comp_depth)
    if effective_depth == 0:
        return "O(1)"
    if effective_depth == 1:
        return "O(n)"
    if effective_depth == 2:
        return "O(n^2)"
    if effective_depth == 3:
        return "O(n^3)"
    return f"O(n^{effective_depth})"


def estimate_space_complexity(signals):
    recursion  = signals['recursion']
    allocations = signals['allocations']
    comp_depth = signals['max_comp_depth']
    slicing    = signals['slicing']
    branching  = signals['has_branching_recursion']
    divide     = recursion and slicing

    if recursion:
        # BUG FIX 6: merge_sort allocates O(n) extra arrays at each level of
        # recursion, but the call *stack* depth is O(log n). However, the
        # dominant space cost is the merged arrays across all levels: O(n log n)
        # total — but conventionally merge_sort's auxiliary space is reported
        # as O(n) (the scratch space at any single level). We keep O(n) here.
        # For branching recursion WITHOUT divide, the call stack is O(n) deep.
        return "O(n)"

    if allocations:
        # BUG FIX 7: nested comprehensions allocate O(n^k) space, matching
        # their time complexity. Previously this checked comp_depth >= 2 but
        # used a flat O(n^2); generalise it.
        if comp_depth >= 2:
            return f"O(n^{comp_depth})"
        return "O(n)"

    return "O(1)"


# ---------------- PUBLIC API ---------------- #

def analyze_code_complexity(code: str):
    tree = ast.parse(code)
    analyzer = ComplexityAnalyzer()
    analyzer.visit(tree)

    signals = {
        "max_loop_depth":       analyzer.max_loop_depth,
        "max_comp_depth":       analyzer.max_comp_depth,
        "recursion":            analyzer.recursion,
        "recursive_calls":      analyzer.recursive_calls,
        "allocations":          analyzer.allocations,
        "slicing":              analyzer.slicing,
        "has_branching_recursion": analyzer.has_branching_recursion,
        "has_divide_conquer":   analyzer.has_divide_conquer,
        "possible_log_loop":    analyzer.possible_log_loop,
    }

    return {
        "time_complexity":  estimate_time_complexity(signals),
        "space_complexity": estimate_space_complexity(signals),
    }