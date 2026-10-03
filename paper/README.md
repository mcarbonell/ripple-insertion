# Academic Paper: Ripple Insertion for Dynamic TSP

This directory contains the formal academic manuscript, LaTeX sources, bibliography, and reproduction artifacts for the paper:

> **"Ripple Insertion: A Dynamic Routing Heuristic with Spatial Indexing and Cascading Local Relocation for Online TSP"**  
> *Author:* Mario Raúl Carbonell Martínez (\texttt{marioraulcarbonell@gmail.com})  

---

## Files in this Directory

- `main.pdf` / `paper.pdf`: Pre-compiled publication-grade PDF manuscript (8 pages, formatted in pre-print standard layout).
- `main.tex` / `paper.tex`: Publication-ready LaTeX source file matching the standard pre-print style of the research suite.
- `paper.md`: Complete, self-contained academic manuscript in GitHub Flavored Markdown with mathematical formulas, algorithms, benchmark tables, and references.
- `references.bib`: BibTeX bibliography file with complete peer-reviewed citations.
- `README.md`: This file.

---

## Compiling the LaTeX Manuscript

To compile `main.tex` into a PDF:

```bash
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

Or using `latexmk`:

```bash
latexmk -pdf main.tex
```

---

## Reproducing Experimental Results

All experimental numbers, tables, and statistics reported in the paper are deterministically reproducible with a single command:

```bash
npm run experiment
```

This generates:
- `results/experimental_battery.json`: Complete raw JSON data with system metadata, per-insertion times, and Wilcoxon test statistics.
- `results/experimental_battery.csv`: Structured CSV for statistical analysis in R, Python (Pandas), or Julia.
- `results/experimental_battery.md`: Markdown summary tables matching the paper's tables.

---

## Citation

To cite this work, please use the following BibTeX entry:

```bibtex
@article{carbonell2026ripple,
  title={Ripple Insertion: A Dynamic Routing Heuristic with Spatial Indexing and Cascading Local Relocation for Online TSP},
  author={Carbonell Mart{\'\i}nez, Mario Ra{\'u}l},
  journal={arXiv preprint},
  year={2026},
  url={https://github.com/mcarbonell/ripple-insertion}
}
```
