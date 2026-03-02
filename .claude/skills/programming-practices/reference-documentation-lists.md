# Documentation: lists and line breaks

This reference details the list-formatting rules referenced from the main programming-practices skill.

## Rule: blank line between list items

**Insert a blank line between each list item** (bullet or numbered). Do not write several list items in a row with no blank line in between.

### Why

- Consecutive list lines without spacing form a dense block that is harder to scan.
- A blank line between items improves readability and makes each point easy to find.

### Where to apply

- READMEs, JSDoc, API Reference, and any documentation.
- In code, when listing options or multi-item content (e.g. comment blocks with bullets).

### When to apply

- Any time you add or edit a bullet list or numbered list in docs: add the blank lines between items before finishing.

### Examples

**Avoid** (no blank lines between items):

```markdown
- First point.
- Second point.
- Third point.
```

**Prefer** (blank line between each item):

```markdown
- First point.

- Second point.

- Third point.
```

Same for numbered lists:

```markdown
1. Step one.

2. Step two.

3. Step three.
```
