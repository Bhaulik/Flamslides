# 🔥 Flamslides - AI-Powered Presentation Generator

Flamslides is a modern web application that leverages OpenAI's GPT-4 and DALL-E 3 models to automatically generate and refine beautiful presentations. Create engaging slides in seconds with the power of AI!
Developed and maintained by Brijesh Patel & Bhaulik Patel

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
- **PowerPoint Generation**: PptxGenJS
- **QR Code**: QRCode.react

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

There are two ways to provide your OpenAI API key:

1. **Development/Self-hosted**: Using `.env` file
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Browser Storage** (Recommended for users):
   - Enter your API key directly in the application
   - Key is stored securely in your browser's localStorage
   - ⚠️ Note: We never store or transmit your API key to any server
   - Key is only used for direct communication between your browser and OpenAI

### Security Notes
- Your API key is stored locally on your device only
- Uses browser's localStorage with encryption
- Direct browser-to-OpenAI communication
- No server storage or transmission of keys
- Clear browser data to remove stored key

### API Key Management
```typescript
// Example implementation
const storeApiKey = (key: string) => {
  // Encrypt before storing
  const encryptedKey = encryptKey(key);
  localStorage.setItem('openai_api_key', encryptedKey);
};

const getApiKey = () => {
  const encryptedKey = localStorage.getItem('openai_api_key');
  return encryptedKey ? decryptKey(encryptedKey) : null;
};
```

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

## 📚 Open Source Libraries

This project stands on the shoulders of giants. We're grateful to these amazing open-source projects:

- [PptxGenJS](https://github.com/gitbrent/PptxGenJS/) - Powers our PowerPoint export functionality with a robust JavaScript API
- [Shadcn UI](https://ui.shadcn.com/) - Beautifully designed components built with Radix UI and Tailwind CSS
- [QRCode.react](https://github.com/zpao/qrcode.react) - React component to generate QR codes
- [Lucide React](https://lucide.dev/) - Beautiful & consistent icon pack
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation

## 🚀 Future Improvements

### API Key Management Enhancement
- Add end-to-end encryption for API key storage
- Implement secure key rotation
- Add option to use temporary keys
- Provide usage analytics and limits

### Server-Side Storage Enhancement
Currently, presentations are stored in the browser's localStorage, which has limitations:
- Data is only accessible on the device that created it
- Storage size is limited
- No sharing capabilities across devices

Planned improvements:
```typescript
// Future Implementation
const generatePresentationId = async () => {
  const presentationData = {
    timestamp: Date.now(),
    slides: slides.map(slide => ({
      title: slide.title,
      body: slide.body,
      notes: slide.notes,
      imageUrl: slide.imageUrl,
      ai_image_description: slide.ai_image_description
    }))
  };

  // Store presentation in database
  const response = await fetch('/api/presentations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(presentationData)
  });

  return response.json();
};
```

Benefits of server-side storage:
- **Cross-device Access**: Access presentations from any device
- **Improved Sharing**: Share presentations via URLs and QR codes
- **Persistent Storage**: Data remains available after browser clear
- **Better Security**: Implement proper authentication and authorization
- **Collaboration Features**: Enable real-time collaboration (future)
