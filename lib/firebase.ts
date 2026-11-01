import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore, 
  doc, 
  getDocFromServer,
  memoryLocalCache,
  Firestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with settings for connection stability in sandboxed environments
// We use memoryLocalCache to avoid IndexedDB errors in restrictive sandbox environments.
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
    localCache: memoryLocalCache()
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  // If already initialized, we get the existing instance.
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = dbInstance;

export const auth = getAuth(app);
export const storage = getStorage(app);

// No longer running testConnection() automatically to reduce idle stream noise
// async function testConnection() { ... }

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export interface FirestoreErrorResult {
  success: false;
  message: string;
  error: string;
  code?: string;
  operationType: OperationType;
  path: string | null;
  authInfo: FirestoreErrorInfo['authInfo'];
}

function getReadableErrorMessage(error: unknown, operationType: OperationType, _path: string | null): string {
  const errStr = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || '';

  if (code === 'permission-denied' || /permission.?denied/i.test(errStr) || /PERMISSION_DENIED/i.test(errStr)) {
    return 'Permissão negada. Você não tem autorização para realizar esta operação.';
  }
  if (code === 'unauthenticated' || /unauthenticated/i.test(errStr)) {
    return 'Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente.';
  }
  if (code === 'not-found' || /not.?found/i.test(errStr)) {
    return 'O registro solicitado não foi encontrado no banco de dados.';
  }
  if (code === 'already-exists' || /already.?exists/i.test(errStr)) {
    return 'Este registro já existe no sistema.';
  }
  if (code === 'resource-exhausted' || /resource.?exhausted|quota/i.test(errStr)) {
    return 'Limite de requisições excedido. Por favor, aguarde alguns instantes.';
  }
  if (code === 'unavailable' || /unavailable|network/i.test(errStr)) {
    return 'Serviço temporariamente indisponível. Verifique sua conexão com a internet.';
  }
  if (code === 'deadline-exceeded' || /deadline.?exceeded/i.test(errStr)) {
    return 'O tempo limite da requisição expirou. Verifique sua conexão e tente novamente.';
  }
  if (code === 'cancelled' || /cancelled/i.test(errStr)) {
    return 'A operação foi cancelada.';
  }

  let opLabel = 'processar os dados';
  switch (operationType) {
    case OperationType.CREATE:
    case OperationType.WRITE:
      opLabel = 'salvar as informações';
      break;
    case OperationType.UPDATE:
      opLabel = 'atualizar os dados';
      break;
    case OperationType.DELETE:
      opLabel = 'excluir o registro';
      break;
    case OperationType.GET:
    case OperationType.LIST:
      opLabel = 'carregar os dados';
      break;
  }

  return `Não foi possível ${opLabel}. ${errStr.length < 80 ? errStr : 'Tente novamente.'}`;
}

export function handleFirestoreError(
  error: unknown, 
  operationType: OperationType, 
  path: string | null
): FirestoreErrorResult {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as { code?: string })?.code;

  const authInfo = {
    userId: auth.currentUser?.uid,
    email: auth.currentUser?.email,
    emailVerified: auth.currentUser?.emailVerified,
    isAnonymous: auth.currentUser?.isAnonymous,
    tenantId: auth.currentUser?.tenantId,
    providerInfo: auth.currentUser?.providerData.map(provider => ({
      providerId: provider.providerId,
      displayName: provider.displayName,
      email: provider.email,
      photoUrl: provider.photoURL
    })) || []
  };

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo,
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));

  const readableMessage = getReadableErrorMessage(error, operationType, path);

  const result: FirestoreErrorResult = {
    success: false,
    message: readableMessage,
    error: errMessage,
    code: errCode,
    operationType,
    path,
    authInfo
  };

  // Dispara o aviso visual no topo se estiver em ambiente de navegador
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          type: 'error',
          title: 'Erro no Firestore',
          message: readableMessage
        }
      })
    );
  }

  return result;
}
