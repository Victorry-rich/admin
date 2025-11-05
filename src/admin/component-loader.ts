import path from 'path';
import * as url from 'url';

import { ComponentLoader } from 'adminjs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
export const componentLoader = new ComponentLoader();

export const add = (componentName: string, fileURL: string): string => componentLoader.add(componentName, path.join(__dirname, fileURL));

// Register your custom components with camelCase naming (no hyphens!)
const Components = {
  CloudinaryUpload: add('CloudinaryUpload', './components/cloudinary-upload'),
  CloudinaryImage: add('CloudinaryImage', './components/cloudinary-image'),
  JsonEditor: add('JsonEditor', './components/json-editor'),
  Dashboard: add('Dashboard', './components/dashboard'),
  WalletAddress: add('WalletAddress', './components/wallet-address'),
};

export { Components };
