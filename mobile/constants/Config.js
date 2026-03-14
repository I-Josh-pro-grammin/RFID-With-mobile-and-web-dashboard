import { Platform } from 'react-native';

const API_BASE = Platform.OS === 'web' 
  ? 'http://127.0.0.1:5055/api' // For web browsers on host machine
  : 'http://10.0.2.2:5055/api'; // Standard for Android Emulator to host machine

export default {
  API_BASE,
  SESSION_TIMEOUT: 300, // 5 minutes in seconds
};
