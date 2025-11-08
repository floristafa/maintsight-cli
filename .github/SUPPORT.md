# Support

## 🆘 Getting Help

Thank you for using MaintSight! We're here to help you analyze and improve your codebase maintenance.

## 📚 Documentation

Before asking for help, please check our documentation:

- **[User Guide](../docs/USER_GUIDE.md)** - Complete usage instructions
- **[Configuration Guide](../docs/CONFIGURATION_GUIDE.md)** - Environment variables and settings
- **[API Documentation](../docs/API.md)** - Programmatic usage
- **[Architecture Guide](../docs/ARCHITECTURE.md)** - Technical implementation details

## 💬 Community Support

### GitHub Discussions

The best place to ask questions and share experiences:

- **[Q&A](https://github.com/floristafa/maintsight-cli/discussions/categories/q-a)** - Ask questions
- **[Show and Tell](https://github.com/floristafa/maintsight-clifloristafa/maintsight-cli/discussions/categories/show-and-tell)** - Share your results
- **[Ideas](https://github.com/floristafa/maintsight-cli/discussions/categories/ideas)** - Suggest improvements

### Issue Tracker

For bugs and feature requests:

- **[Bug Reports](https://github.com/floristafa/maintsight-cli/issues/new?template=bug_report.md)** - Report issues
- **[Feature Requests](https://github.com/floristafa/maintsight-cli/issues/new?template=feature_request.md)** - Suggest features
- **[Search Issues](https://github.com/floristafa/maintsight-cli/issues)** - Check existing issues

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Environment Details**:
   - OS (Windows/macOS/Linux)
   - Node.js version (`node --version`)
   - MaintSight version (`maintsight --version`)

2. **Steps to Reproduce**:
   - Repository details (size, age, language)
   - Exact command used
   - Any error messages

3. **Expected vs Actual**:
   - What you expected
   - What actually happened

## 💡 Common Issues

### "Not a git repository" Error

```bash
# Ensure you're in a git repository
git init  # If needed
```

### "Branch not found" Error

```bash
# Check available branches
git branch -a

# Use correct branch
maintsight predict --branch your-branch
```

### No Results

- Ensure repository has commit history
- Check that source files exist
- Try increasing `--max-commits`

### Permission Errors

```bash
# Install globally with proper permissions
sudo npm install -g maintsight
# or
npm install -g maintsight --prefix ~/.npm-global
```

## 🚀 Feature Requests

Before requesting features:

1. **Search existing issues** - It might be planned
2. **Provide use cases** - Explain the benefit
3. **Be specific** - Clear requirements help
## 🤝 Contributing

Want to contribute code or documentation?

- See [Contributing Guide](./docs/CONTRIBUTING.md) for development setup
- Read [Code of Conduct](./CODE_OF_CONDUCT.md) for community guidelines
- Check [Good First Issues](https://github.com/floristafa/maintsight-cli/labels/good%20first%20issue) for starter tasks

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/floristafa/maintsight-cli/issues)
- **Discussions**: [GitHub Discussions](https://github.com/floristafa/maintsight-cli/discussions)
- **npm**: [npmjs.com/package/maintsight](https://www.npmjs.com/package/maintsight)

## ⏰ Response Times

- **Community Support** (GitHub Discussions/Issues): Usually within 24-48 hours
- **Security Issues**: Acknowledged within 48 hours
- **Pull Requests**: Initial review within 1 week

We're a small team, so please be patient! Community members often help each other faster than we can respond.

## 🙏 Thank You

Thank you for using MaintSight! Your feedback helps improve the tool for everyone.

---

**Remember**: Be kind, be respectful, and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) in all interactions.
