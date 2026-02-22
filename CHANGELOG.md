# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-02-22

### Added
- Added fixtures for all non-Plexus encounters from big log
- Added per-fight player damage regression tests

### Changed
- Use hardcoded golden damage values instead of self-validating fixtures
- Run all tests across all fixture files

### Documentation
- Added latest-release install one-liner to README

## [0.1.0] - 2026-02-20

### Initial Release

Core functionality:
- List fights from combat logs
- Search events with filters (encounter, event types)
- Ability-scoped events with advanced filtering
- Multiple output formats (json, jsonl, csv, table, md)
- Sorting and time-range filtering
- Raw line output support
