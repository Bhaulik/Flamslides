# 🔥 Flamslides - AI-Powered Presentation Generator

Flamslides is a modern web application that leverages OpenAI's GPT-4 and DALL-E 3 models to automatically generate and refine beautiful presentations. Create engaging slides in seconds with the power of AI!

## ✨ Features

- **AI-Powered Slide Generation**: Generate professional presentations from just a topic and description using GPT-4
- **DALL-E 3 Image Generation**: Create stunning, presentation-ready visuals automatically
- **Interactive Chat Refinement**: Fine-tune your slides through a chat interface
- **Real-time Preview**: See your slides come to life as you make changes
- **Modern UI Components**: Built with Shadcn UI for a beautiful, responsive experience
- **Auto-playing Slideshow**: Present your slides with automatic transitions

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: Shadcn UI (based on Radix UI)
- **Styling**: Tailwind CSS
- **AI Integration**: 
  - OpenAI GPT-4 for content generation
  - DALL-E 3 for image generation
- **State Management**: React Hooks
- **Validation**: Zod
- **Logging**: Custom logger implementation

## 🚀 Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- OpenAI API key with access to GPT-4 and DALL-E 3

### Installation

1. Clone the repository:
   ```sh
   git clone <YOUR_REPO_URL>
   cd flamslides
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```sh
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the development server:
   ```sh
   npm run dev
   ```

## 🎯 Usage

1. Enter your presentation topic and provide a brief description
2. Choose the number of slides and presentation duration
3. Select your preferred style (professional, casual, or academic)
4. Click "Generate Slides" to create your presentation with:
   - GPT-4 generated content
   - DALL-E 3 generated images
   - Professional styling and layout
5. Use the chat interface to refine individual slides
6. Navigate through your presentation using the controls

## 🔒 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_OPENAI_API_KEY` | Your OpenAI API key with access to GPT-4 and DALL-E 3 |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.


## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Get your API keys:
   - OpenAI API Key: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

3. Add your API keys to `.env`:
```env
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```
