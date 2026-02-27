# Contributing to Ladder2Grafcet

First off, thank you for considering contributing to this industrial automation tool!

## How to Contribute

1. **Fork the Repository**: Create your own fork of the project.
2. **Create a Branch**: Use a descriptive name for your branch (e.g., `feat/add-analog-support`).
3. **Implement Changes**: Ensure your code follows the existing style and nomenclature.
4. **Naming Standards**: Always use Siemens TIA Portal style for PLC tags and addresses (e.g., `%I0.0`, `%Q0.1`, `M_Cycle`).
5. **Commit**: Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
6. **Pull Request**: Submit a PR to the `main` branch with a clear description of the improvements.

## Development Standards

- **GRAFCET Rendering**: Stick to the IEC 61131-3 visual standard.
- **AI Prompts**: Any changes to the prompts in `app.js` must be tested against multimodal inputs (Text + Image).
- **Compatibility**: Ensure SCL/AWL output remains compatible with TIA Portal V16-V19.

## Code of Conduct

Please be respectful and professional in all communications. We are building tools for the engineering community.
