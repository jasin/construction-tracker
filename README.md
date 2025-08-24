# Vue.js Construction Tracker

## 📁 Project Structure

```
src/
├── views/          # Page-level components (routable)
├── components/     # Reusable UI components
│   ├── ui/         # Pure UI components
│   ├── layout/     # Layout components
│   ├── forms/      # Form components
│   ├── widgets/    # Complex widgets
│   └── features/   # Feature-specific components
├── composables/    # Vue 3 Composition API logic
├── stores/         # State management (Pinia)
├── services/       # External service integrations
├── utils/          # Utility functions
├── constants/      # Application constants
└── router/         # Routing configuration
```

## 🚀 Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

## 📖 Development Guidelines

- **Views**: Use for page-level components that correspond to routes
- **Components**: Create reusable, focused components with single responsibilities
- **Composables**: Extract business logic and stateful logic into composables
- **Stores**: Use Pinia for global state management
- **Services**: Handle external API calls and integrations

## 🔧 Architecture Decisions

- **Vue 3 Composition API**: For better code organization and reusability
- **Pinia**: Modern state management for Vue 3
- **PrimeVue**: UI component library
- **Firebase**: Backend services
- **Modular Structure**: Clear separation of concerns
