import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  onSnapshot,
  getDocFromServer,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';

const LOCAL_DISASTERS_KEY = 'lmls_local_disasters';

const readLocalDisasters = (): FirestoreDisaster[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_DISASTERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FirestoreDisaster[];
  } catch {
    return [];
  }
};

const writeLocalDisasters = (disasters: FirestoreDisaster[]) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LOCAL_DISASTERS_KEY, JSON.stringify(disasters));
  } catch {
    // Ignore storage write failures.
  }
};

/*
================================================================================================
                                   FIRESTORE DATA STRUCTURE DIAGRAM
================================================================================================

/tasks/{taskId}               --> [Document] (Represents user tasks)
  ├── title                   : string
  ├── description             : string
  ├── deadline                : string
  ├── priority                : string ('low' | 'medium' | 'high' | 'panic')
  ├── duration                : number
  ├── completed               : boolean
  ├── category                : string (optional)
  ├── subtasks                : array [ { id: string, title: string, completed: boolean } ]
  ├── userId                  : string (corresponds to Firebase auth.uid)
  └── createdAt               : timestamp / serverTimestamp()

/insights/{insightId}         --> [Document] (Represents AI generated companion insights)
  ├── text                    : string
  ├── userId                  : string
  └── createdAt               : timestamp

/disasters/{disasterId}       --> [Document] (User-managed or live merged active disaster)
  ├── id                      : string
  ├── title                   : string
  ├── type                    : string ('earthquake' | 'hurricane' | 'flood' | 'wildfire' | 'tsunami')
  ├── magnitude               : number (0.0 - 10.0)
  ├── depth_km                : number (optional)
  ├── population_affected     : number
  ├── damaged_critical        : number
  ├── total_critical          : number
  ├── status                  : string ('active' | 'monitored' | 'resolved')
  ├── total_score             : number (0.0 - 100.0)
  ├── severity_label          : string ('Low' | 'Moderate' | 'High' | 'Critical' | 'Catastrophic')
  ├── recommended_response_level : number (1 - 5)
  ├── userId                  : string
  ├── createdAt               : timestamp
  └── updatedAt               : timestamp

/analysis_results/{resultId} --> [Document] (Saves composite risk calculation outputs)
  ├── disasterId              : string
  ├── total_score             : number
  ├── breakdown               : map { magnitude_score, population_score, infrastructure_score, depth_type_score }
  ├── severity_label          : string
  ├── recommended_response_level : number
  ├── userId                  : string
  └── createdAt               : timestamp

================================================================================================
*/

// ================================================================================================
// Firestore Error Handlers and Operation Type Definitions
// ================================================================================================

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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ================================================================================================
// Initial Boot Connection Verification (Mandatory Constraint)
// ================================================================================================
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client appears to be offline.");
    }
  }
}
testConnection();

// ================================================================================================
// Core Types for Firestore Collections
// ================================================================================================

export interface FirestoreTask {
  title: string;
  description: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'panic';
  duration: number;
  completed: boolean;
  category?: string;
  subtasks: { id: string; title: string; completed: boolean }[];
  userId: string;
  createdAt?: any;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface FirestoreDisaster {
  id?: string;
  title: string;
  type: 'earthquake' | 'hurricane' | 'flood' | 'wildfire' | 'tsunami';
  magnitude: number;
  depth_km?: number | null;
  population_affected: number;
  damaged_critical: number;
  total_critical: number;
  status: 'active' | 'monitored' | 'resolved';
  total_score: number;
  severity_label: string;
  recommended_response_level: number;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreAnalysisResult {
  disasterId: string;
  total_score: number;
  breakdown: {
    magnitude_score: number;
    population_score: number;
    infrastructure_score: number;
    depth_type_score: number;
  };
  severity_label: string;
  recommended_response_level: number;
  userId: string;
  createdAt?: any;
}

// ================================================================================================
// Tasks API
// ================================================================================================

export const addTask = async (task: Omit<FirestoreTask, 'userId'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const path = 'tasks';
  try {
    const taskCollection = collection(db, path);
    const docRef = await addDoc(taskCollection, {
      ...task,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...task };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getUserTasks = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const path = 'tasks';
  try {
    const taskCollection = collection(db, path);
    const q = query(taskCollection, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);

    const tasks: any[] = [];
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });
    return tasks;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const subscribeToTasks = (
  callback: (tasks: any[]) => void,
  onError?: (err: Error) => void
) => {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }

  const path = 'tasks';
  const taskCollection = collection(db, path);
  const q = query(taskCollection, where('userId', '==', user.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: any[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    callback(list);
  }, (error) => {
    if (onError) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err: any) {
        onError(err);
      }
    } else {
      console.error("Firestore Tasks onSnapshot error:", error);
    }
  });

  return unsubscribe;
};

export const updateFirestoreTask = async (taskId: string, updates: Partial<Omit<FirestoreTask, 'userId'>>) => {
  const path = `tasks/${taskId}`;
  try {
    const taskDoc = doc(db, 'tasks', taskId);
    await updateDoc(taskDoc, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateTaskStatus = async (taskId: string, completed: boolean) => {
  const path = `tasks/${taskId}`;
  try {
    const taskDoc = doc(db, 'tasks', taskId);
    await updateDoc(taskDoc, { completed });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteFirestoreTask = async (taskId: string) => {
  const path = `tasks/${taskId}`;
  try {
    const taskDoc = doc(db, 'tasks', taskId);
    await deleteDoc(taskDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// ================================================================================================
// Companion Insights API
// ================================================================================================

export const addDailyInsight = async (insight: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const path = 'insights';
  try {
    const insightsCollection = collection(db, path);
    await addDoc(insightsCollection, {
      text: insight,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToInsights = (
  callback: (insights: string[]) => void,
  onError?: (err: Error) => void
) => {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }

  const path = 'insights';
  const insightsCollection = collection(db, path);
  const q = query(insightsCollection, where('userId', '==', user.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: string[] = [];
    const docs = snapshot.docs.map(doc => ({
      text: doc.data().text,
      createdAt: doc.data().createdAt?.seconds || 0
    })).sort((a, b) => b.createdAt - a.createdAt);

    docs.forEach((item) => {
      list.push(item.text);
    });

    callback(list);
  }, (error) => {
    if (onError) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err: any) {
        onError(err);
      }
    } else {
      console.error("Firestore Insights onSnapshot error:", error);
    }
  });

  return unsubscribe;
};

// ================================================================================================
// Active Disasters and Geospatial Risk Analysis API
// ================================================================================================

/**
 * Saves a disaster analysis result into Firestore under the 'analysis_results' collection.
 */
export const saveAnalysisResult = async (disasterId: string, result: Omit<FirestoreAnalysisResult, 'userId' | 'disasterId'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");

  const path = 'analysis_results';
  try {
    const analysisCollection = collection(db, path);
    const docRef = await addDoc(analysisCollection, {
      ...result,
      disasterId,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, disasterId, ...result };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getAnalysisResult = async (disasterId: string) => {
  const user = auth.currentUser;
  if (!user) return null;

  const path = 'analysis_results';
  try {
    const coll = collection(db, path);
    const q = query(coll, where('userId', '==', user.uid), where('disasterId', '==', disasterId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as any;
    }
    return null;
  } catch (error) {
    console.warn("Failed to get analysis result from Firestore:", error);
    return null;
  }
};

/**
 * Adds an active disaster to the 'disasters' collection.
 */
export const addDisaster = async (disaster: Omit<FirestoreDisaster, 'userId' | 'status'>) => {
  const user = auth.currentUser;
  if (!user) {
    const localDisasters = readLocalDisasters();
    const id = `local-${Date.now()}`;
    const saved = {
      id,
      ...disaster,
      status: 'active' as const,
      userId: 'local-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeLocalDisasters([...localDisasters, saved]);
    return saved;
  }

  const path = 'disasters';
  try {
    const disasterCollection = collection(db, path);
    const docRef = await addDoc(disasterCollection, {
      ...disaster,
      status: 'active',
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, ...disaster, status: 'active' as const };
  } catch (error) {
    const localDisasters = readLocalDisasters();
    const id = `local-${Date.now()}`;
    const saved = {
      id,
      ...disaster,
      status: 'active' as const,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    writeLocalDisasters([...localDisasters, saved]);
    return saved;
  }
};

export const upsertDisaster = async (disaster: Omit<FirestoreDisaster, 'userId' | 'status'> & { id?: string; status?: 'active' | 'monitored' | 'resolved' }) => {
  const user = auth.currentUser;
  const path = 'disasters';
  const disasterId = disaster.id || `${user?.uid || 'local-user'}-${Date.now()}`;

  const payload = {
    status: 'active' as const,
    ...disaster,
    id: disasterId,
    userId: user?.uid || 'local-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const localDisasters = readLocalDisasters();
  const existingIndex = localDisasters.findIndex((item) => item.id === disasterId);
  const nextLocalDisasters = existingIndex >= 0
    ? localDisasters.map((item) => item.id === disasterId ? payload : item)
    : [...localDisasters, payload];
  writeLocalDisasters(nextLocalDisasters);

  if (!user) {
    return payload;
  }

  try {
    const disasterDoc = doc(db, path, disasterId);
    await setDoc(disasterDoc, {
      status: 'active',
      ...disaster,
      id: disasterId,
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return { id: disasterId, status: 'active' as const, ...disaster };
  } catch (error) {
    return payload;
  }
};

/**
 * Updates an active disaster's status ('active' | 'monitored' | 'resolved') and metadata.
 */
export const updateDisasterStatus = async (disasterId: string, status: 'active' | 'monitored' | 'resolved') => {
  const path = `disasters/${disasterId}`;
  try {
    const disasterDoc = doc(db, 'disasters', disasterId);
    await updateDoc(disasterDoc, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

/**
 * Attaches a real-time onSnapshot listener to subscribe to the current user's active disasters.
 * Returns an unsubscribe function.
 */
export const subscribeToDisasters = (
  callback: (disasters: FirestoreDisaster[]) => void,
  onError?: (err: Error) => void
) => {
  const user = auth.currentUser;
  const localDisasters = readLocalDisasters();
  callback(localDisasters);

  if (!user) {
    return () => {};
  }

  const path = 'disasters';
  const disasterCollection = collection(db, path);
  const q = query(disasterCollection, where('userId', '==', user.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: FirestoreDisaster[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as FirestoreDisaster);
    });
    const merged = [...localDisasters, ...list.filter((item) => !localDisasters.some((local) => local.id === item.id))];
    callback(merged);
  }, (error) => {
    if (onError) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err: any) {
        onError(err);
      }
    } else {
      console.error("Firestore onSnapshot error:", error);
    }
  });

  return unsubscribe;
};

export interface FirestoreAllocation {
  id?: string;
  disasterId: string;
  disasterTitle: string;
  recommendations: any[];
  routes: any[];
  approvedAt: string;
  status: 'pending' | 'approved' | 'deployed';
  userId: string;
  createdAt: any;
}

export const saveResourceAllocation = async (allocation: Omit<FirestoreAllocation, 'userId' | 'createdAt'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const path = 'resource_allocations';
  try {
    const coll = collection(db, path);
    const docRef = await addDoc(coll, {
      ...allocation,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...allocation };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getResourceAllocations = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const path = 'resource_allocations';
  try {
    const coll = collection(db, path);
    const q = query(coll, where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const list: any[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

// ================================================================================================
// Emergency Alerts API
// ================================================================================================

export interface FirestoreAlert {
  id?: string;
  disasterId: string;
  disasterTitle: string;
  disasterType: string;
  severity: 'info' | 'moderate' | 'high' | 'critical' | 'emergency';
  headline: string;
  summary: string;
  affectedArea: string;
  recommendedActions: string[];
  userId: string;
  issuedAt: string;
  expiresAt: string;
  acknowledged: boolean;
  createdAt?: any;
}

export const addAlert = async (alert: Omit<FirestoreAlert, 'userId' | 'issuedAt' | 'expiresAt'> & { issuedAt?: string; expiresAt?: string }) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const path = 'alerts';
  try {
    const coll = collection(db, path);
    const issued = alert.issuedAt ? new Date(alert.issuedAt).toISOString() : new Date().toISOString();
    const expires = alert.expiresAt ? new Date(alert.expiresAt).toISOString() : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    
    const docRef = await addDoc(coll, {
      ...alert,
      userId: user.uid,
      issuedAt: issued,
      expiresAt: expires,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...alert, issuedAt: issued, expiresAt: expires };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateAlertAcknowledgment = async (alertId: string, acknowledged: boolean) => {
  const path = `alerts/${alertId}`;
  try {
    const alertDoc = doc(db, 'alerts', alertId);
    await updateDoc(alertDoc, { acknowledged });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToAlerts = (
  callback: (alerts: FirestoreAlert[]) => void,
  onError?: (err: Error) => void
) => {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error("No authenticated user");
    if (onError) onError(error);
    return () => {};
  }

  const path = 'alerts';
  const alertsCollection = collection(db, path);
  const q = query(alertsCollection, where('userId', '==', user.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: FirestoreAlert[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as FirestoreAlert);
    });
    callback(list);
  }, (error) => {
    if (onError) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err: any) {
        onError(err);
      }
    } else {
      console.error("Firestore Alerts onSnapshot error:", error);
    }
  });

  return unsubscribe;
};

// ================================================================================================
// Situation Reports API
// ================================================================================================

export interface FirestoreSituationReport {
  id?: string;
  disasterId: string;
  disasterTitle: string;
  title: string;
  content: string;
  userId: string;
  riskScore: number;
  affectedPopulation: number;
  damagedFacilities: number;
  totalFacilities: number;
  createdAt?: any;
}

export const addSituationReport = async (report: Omit<FirestoreSituationReport, 'userId'>) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const path = 'situation_reports';
  try {
    const coll = collection(db, path);
    const docRef = await addDoc(coll, {
      ...report,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    return { id: docRef.id, ...report, userId: user.uid };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToSituationReports = (
  callback: (reports: FirestoreSituationReport[]) => void,
  onError?: (err: Error) => void
) => {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error("No authenticated user");
    if (onError) onError(error);
    return () => {};
  }

  const path = 'situation_reports';
  const reportsCollection = collection(db, path);
  const q = query(reportsCollection, where('userId', '==', user.uid));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: FirestoreSituationReport[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as FirestoreSituationReport);
    });
    callback(list);
  }, (error) => {
    if (onError) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err: any) {
        onError(err);
      }
    } else {
      console.error("Firestore Situation Reports onSnapshot error:", error);
    }
  });

  return unsubscribe;
};


// ================================================================================================
// Chat Sessions API
// ================================================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface FirestoreChatSession {
  id?: string;
  disasterId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt?: any;
  updatedAt?: any;
}

export const createChatSession = async (disasterId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const path = 'chat_sessions';
  try {
    const coll = collection(db, path);
    const docRef = await addDoc(coll, {
      disasterId,
      userId: user.uid,
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id: docRef.id, disasterId, userId: user.uid, messages: [] };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateChatSessionMessages = async (sessionId: string, messages: ChatMessage[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const path = `chat_sessions/${sessionId}`;
  try {
    const docRef = doc(db, 'chat_sessions', sessionId);
    await updateDoc(docRef, {
      messages,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToChatSessions = (
  disasterId: string,
  callback: (sessions: FirestoreChatSession[]) => void,
  onError?: (err: Error) => void
) => {
  const user = auth.currentUser;
  if (!user) {
    const error = new Error("No authenticated user");
    if (onError) onError(error);
    return () => {};
  }

  const path = 'chat_sessions';
  const sessionsCollection = collection(db, path);
  const q = query(
    sessionsCollection, 
    where('userId', '==', user.uid),
    where('disasterId', '==', disasterId)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: FirestoreChatSession[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as FirestoreChatSession);
    });
    callback(list);
  }, (error) => {
    if (onError) {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err: any) {
        onError(err);
      }
    } else {
      console.error("Firestore Chat Sessions onSnapshot error:", error);
    }
  });

  return unsubscribe;
};

export const deleteChatSession = async (sessionId: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const path = `chat_sessions/${sessionId}`;
  try {
    const docRef = doc(db, 'chat_sessions', sessionId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};



