import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  increment,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, ensureFirebaseConfigured } from "./firebase";
import {
  Issue,
  IssueStatus,
  UserProfile,
  Comment,
  StatusUpdate,
  Department,
  IssueFilter,
} from "@/types";
import {
  POINT_EVENTS,
  getLevelFromPoints,
  checkNewBadges,
} from "./gamification";

function withTimeout<T>(promise: Promise<T>, ms = 15000, message = "Request timed out") {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

const notifyLocalIssuesUpdate = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("local-issues-updated"));
  }
};

export function getLocalIssues(): Issue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("pendingIssues");
    if (!raw) return [];
    const list = JSON.parse(raw) as Issue[];
    // Filter out any corrupted items with no id or "undefined" as id
    return list.filter((i) => i && i.id && i.id !== "undefined");
  } catch (error) {
    console.warn("Failed to parse local issues:", error);
    return [];
  }
}

// ==================== ISSUES ====================
export async function createIssue(
  issueData: Omit<Issue, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  ensureFirebaseConfigured("Creating an issue");
  const docRef = await withTimeout(addDoc(collection(db, "issues"), {
    ...issueData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }), 15000, "Issue submission timed out");
  return docRef.id;
}

export async function getIssueById(id: string): Promise<Issue | null> {
  // Check localStorage first for local/offline issue
  const local = getLocalIssues();
  const found = local.find((i) => i.id === id);
  if (found) return found;

  try {
    ensureFirebaseConfigured("Loading an issue");
    const docRef = doc(db, "issues", id);
    const snap = await withTimeout(getDoc(docRef), 700, "Firestore getDoc timed out");
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Issue;
  } catch (error) {
    console.warn("getIssueById query failed, returning null:", error);
    return null;
  }
}

export async function updateIssueStatus(
  issueId: string,
  status: IssueStatus,
  updatedBy: string,
  updatedByName: string,
  note?: string,
  imageUrl?: string
): Promise<void> {
  const update: StatusUpdate = {
    status,
    updatedBy,
    updatedByName,
    note,
    timestamp: Date.now(),
    imageUrl,
  };

  const updateLocal = () => {
    if (typeof window !== "undefined") {
      try {
        const local = JSON.parse(localStorage.getItem("pendingIssues") || "[]") as Issue[];
        const updated = local.map((i) => {
          if (i.id === issueId) {
            return {
              ...i,
              status,
              updatedAt: Date.now(),
              ...(status === "resolved" ? { resolvedAt: Date.now() } : {}),
              statusHistory: [...(i.statusHistory || []), update],
            };
          }
          return i;
        });
        localStorage.setItem("pendingIssues", JSON.stringify(updated));
        notifyLocalIssuesUpdate();
      } catch (e) {
        console.warn("Failed to update local cache:", e);
      }
    }
  };

  try {
    ensureFirebaseConfigured("Updating status");
    await withTimeout(updateDoc(doc(db, "issues", issueId), {
      status,
      updatedAt: Date.now(),
      ...(status === "resolved" ? { resolvedAt: Date.now() } : {}),
      statusHistory: arrayUnion(update),
    }), 2000, "Update status timed out");
    updateLocal();
  } catch (error) {
    console.warn("Firestore updateIssueStatus failed, modifying local state:", error);
    updateLocal();
  }
}

export async function deleteIssue(issueId: string): Promise<void> {
  try {
    ensureFirebaseConfigured("Deleting an issue");
    await withTimeout(deleteDoc(doc(db, "issues", issueId)), 10000, "Delete issue timed out");
  } catch (error) {
    console.warn("Firestore deleteIssue failed, modifying local state:", error);
  }

  // Always update local cache
  if (typeof window !== "undefined") {
    try {
      const local = JSON.parse(localStorage.getItem("pendingIssues") || "[]") as Issue[];
      const updated = local.filter((i) => i.id !== issueId);
      localStorage.setItem("pendingIssues", JSON.stringify(updated));
      notifyLocalIssuesUpdate();
    } catch (e) {
      console.warn("Failed to delete issue from local cache:", e);
    }
  }
}

export async function verifyIssue(
  issueId: string,
  userId: string
): Promise<void> {
  try {
    ensureFirebaseConfigured("Verifying issue");
    const issueRef = doc(db, "issues", issueId);
    const snap = await withTimeout(getDoc(issueRef), 10000, "Get issue timed out");
    if (!snap.exists()) throw new Error("Document does not exist");

    const data = snap.data() as Issue;
    const verifiedBy = data.verifiedBy || [];

    if (verifiedBy.includes(userId)) return; // Already verified

    const newVerifiedBy = [...verifiedBy, userId];
    const shouldAutoVerify = newVerifiedBy.length >= 3;

    await withTimeout(updateDoc(issueRef, {
      verifiedBy: arrayUnion(userId),
      updatedAt: Date.now(),
      ...(shouldAutoVerify && data.status === "reported"
        ? { status: "verified" }
        : {}),
    }), 2000, "Verify issue timed out");
  } catch (error) {
    console.warn("Firestore verifyIssue failed, verifying locally:", error);
    if (typeof window !== "undefined") {
      const local = JSON.parse(localStorage.getItem("pendingIssues") || "[]") as Issue[];
      const updated = local.map((i) => {
        if (i.id === issueId) {
          const verifiedBy = i.verifiedBy || [];
          if (verifiedBy.includes(userId)) return i;
          const newVerifiedBy = [...verifiedBy, userId];
          const shouldAutoVerify = newVerifiedBy.length >= 3;
          return {
            ...i,
            verifiedBy: newVerifiedBy,
            updatedAt: Date.now(),
            ...(shouldAutoVerify && i.status === "reported" ? { status: "verified" as IssueStatus } : {}),
          };
        }
        return i;
      });
      localStorage.setItem("pendingIssues", JSON.stringify(updated));
      notifyLocalIssuesUpdate();
    }
  }
}

export async function upvoteIssue(
  issueId: string,
  userId: string
): Promise<void> {
  try {
    ensureFirebaseConfigured("Upvoting issue");
    const issueRef = doc(db, "issues", issueId);
    const snap = await withTimeout(getDoc(issueRef), 10000, "Get issue timed out");
    if (!snap.exists()) throw new Error("Document does not exist");

    const data = snap.data() as Issue;
    const upvotedBy = data.upvotedBy || [];

    if (upvotedBy.includes(userId)) {
      await withTimeout(updateDoc(issueRef, {
        upvotes: increment(-1),
        upvotedBy: arrayRemove(userId),
      }), 2000, "Upvote timed out");
    } else {
      await withTimeout(updateDoc(issueRef, {
        upvotes: increment(1),
        upvotedBy: arrayUnion(userId),
      }), 2000, "Upvote timed out");
    }
  } catch (error) {
    console.warn("Firestore upvoteIssue failed, upvoting locally:", error);
    if (typeof window !== "undefined") {
      const local = JSON.parse(localStorage.getItem("pendingIssues") || "[]") as Issue[];
      const updated = local.map((i) => {
        if (i.id === issueId) {
          const upvotedBy = i.upvotedBy || [];
          const hasUpvoted = upvotedBy.includes(userId);
          return {
            ...i,
            upvotes: hasUpvoted ? (i.upvotes || 1) - 1 : (i.upvotes || 0) + 1,
            upvotedBy: hasUpvoted ? upvotedBy.filter((id) => id !== userId) : [...upvotedBy, userId],
          };
        }
        return i;
      });
      localStorage.setItem("pendingIssues", JSON.stringify(updated));
      notifyLocalIssuesUpdate();
    }
  }
}

export async function addComment(
  issueId: string,
  comment: Omit<Comment, "id">
): Promise<void> {
  const newComment = { ...comment, id: Date.now().toString() };
  try {
    ensureFirebaseConfigured("Adding comment");
    await withTimeout(updateDoc(doc(db, "issues", issueId), {
      comments: arrayUnion(newComment),
      updatedAt: Date.now(),
    }), 2000, "Add comment timed out");
  } catch (error) {
    console.warn("Firestore addComment failed, adding comment locally:", error);
    if (typeof window !== "undefined") {
      const local = JSON.parse(localStorage.getItem("pendingIssues") || "[]") as Issue[];
      const updated = local.map((i) => {
        if (i.id === issueId) {
          return {
            ...i,
            comments: [...(i.comments || []), newComment],
            updatedAt: Date.now(),
          };
        }
        return i;
      });
      localStorage.setItem("pendingIssues", JSON.stringify(updated));
      notifyLocalIssuesUpdate();
    }
  }
}

export async function assignDepartment(
  issueId: string,
  department: Department,
  updatedBy = "admin",
  updatedByName = "Admin Official",
  note?: string
): Promise<void> {
  const update: StatusUpdate = {
    status: "assigned",
    updatedBy,
    updatedByName,
    note: note || `Assigned to ${department}`,
    timestamp: Date.now(),
  };

  try {
    ensureFirebaseConfigured("Assigning department");
    await withTimeout(updateDoc(doc(db, "issues", issueId), {
      department,
      status: "assigned",
      updatedAt: Date.now(),
      statusHistory: arrayUnion(update),
    }), 2000, "Assign department timed out");
  } catch (error) {
    console.warn("Firestore assignDepartment failed, assigning locally:", error);
    if (typeof window !== "undefined") {
      const local = JSON.parse(localStorage.getItem("pendingIssues") || "[]") as Issue[];
      const updated = local.map((i) => {
        if (i.id === issueId) {
          return {
            ...i,
            department,
            status: "assigned" as IssueStatus,
            updatedAt: Date.now(),
            statusHistory: [...(i.statusHistory || []), update],
          };
        }
        return i;
      });
      localStorage.setItem("pendingIssues", JSON.stringify(updated));
      notifyLocalIssuesUpdate();
    }
  }
}


export function subscribeToIssues(
  filters: IssueFilter,
  callback: (issues: Issue[]) => void
): () => void {
  let lastFirestoreIssues: Issue[] = [];

  const emitMerged = () => {
    const localIssues = getLocalIssues();
    const merged = [...localIssues];
    lastFirestoreIssues.forEach((fi) => {
      if (!merged.some((li) => li.id === fi.id || (li.title === fi.title && Math.abs(li.createdAt - fi.createdAt) < 5000))) {
        merged.push(fi);
      }
    });
    merged.sort((a, b) => b.createdAt - a.createdAt);

    let issues = merged;
    // Client-side filtering
    if (filters.category) {
      issues = issues.filter((i) => i.category === filters.category);
    }
    if (filters.status) {
      issues = issues.filter((i) => i.status === filters.status);
    }
    if (filters.severity) {
      issues = issues.filter((i) => i.severity === filters.severity);
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      issues = issues.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location?.address?.toLowerCase().includes(q)
      );
    }
    callback(issues);
  };

  // Emit cached/localStorage issues immediately for instantaneous page loads!
  emitMerged();

  let hasReceivedSnapshot = false;
  const timeoutId = setTimeout(() => {
    if (!hasReceivedSnapshot) {
      console.warn("Firestore subscription timed out, using localStorage fallback.");
      emitMerged();
    }
  }, 10000);

  const q = query(collection(db, "issues"), orderBy("createdAt", "desc"), limit(100));
  let localUnsubscribe = () => {};

  try {
    const unsubscribe = onSnapshot(q, (snapshot) => {
      hasReceivedSnapshot = true;
      clearTimeout(timeoutId);
      lastFirestoreIssues = snapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id } as Issue)
      );
      emitMerged();
    }, (error) => {
      clearTimeout(timeoutId);
      console.warn("Firestore subscription query failed, falling back to localStorage:", error);
      callback(getLocalIssues());
    });
    localUnsubscribe = unsubscribe;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("Firestore onSnapshot setup failed, falling back to localStorage:", error);
    setTimeout(() => {
      callback(getLocalIssues());
    }, 0);
  }

  // Listen to local changes
  const handleLocalChange = () => {
    emitMerged();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("local-issues-updated", handleLocalChange);
  }

  return () => {
    localUnsubscribe();
    if (typeof window !== "undefined") {
      window.removeEventListener("local-issues-updated", handleLocalChange);
    }
  };
}

export async function getAllIssues(): Promise<Issue[]> {

  try {
    const q = query(collection(db, "issues"), orderBy("createdAt", "desc"));
    const snap = await withTimeout(getDocs(q), 10000, "Get issues timed out");
    const firestoreIssues = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Issue));

    const localIssues = getLocalIssues();
    const merged = [...localIssues];
    firestoreIssues.forEach((fi) => {
      if (!merged.some((li) => li.id === fi.id || (li.title === fi.title && Math.abs(li.createdAt - fi.createdAt) < 5000))) {
        merged.push(fi);
      }
    });
    merged.sort((a, b) => b.createdAt - a.createdAt);
    return merged;
  } catch (error) {
    console.warn("getAllIssues query failed, using localStorage data:", error);
    return getLocalIssues();
  }
}

// ==================== MEDIA UPLOAD ====================
export async function uploadMedia(
  file: File,
  userId: string
): Promise<{ url: string; type: "image" | "video" }> {
  ensureFirebaseConfigured("Uploading media");
  const ext = file.name.split(".").pop();
  const fileName = `issues/${userId}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, fileName);

  await withTimeout(uploadBytes(storageRef, file), 20000, "Media upload timed out");
  const url = await withTimeout(getDownloadURL(storageRef), 10000, "Media download URL timed out");

  return {
    url,
    type: file.type.startsWith("video") ? "video" : "image",
  };
}

// ==================== USER PROFILES ====================
export function cacheUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("cachedUsers");
    const list = raw ? (JSON.parse(raw) as UserProfile[]) : [];
    const index = list.findIndex((u) => u.uid === profile.uid);
    if (index > -1) {
      list[index] = { ...list[index], ...profile };
    } else {
      list.push(profile);
    }
    localStorage.setItem("cachedUsers", JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to cache user profile:", e);
  }
}

export function getCachedUsers(): UserProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cachedUsers");
    return raw ? (JSON.parse(raw) as UserProfile[]) : [];
  } catch {
    return [];
  }
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  try {
    const snap = await withTimeout(getDoc(doc(db, "users", uid)), 10000, "Firestore getUserProfile timed out");
    if (!snap.exists()) return null;
    const profile = snap.data() as UserProfile;
    cacheUserProfile(profile);
    return profile;
  } catch (error) {
    console.warn("getUserProfile failed or timed out, returning cached profile:", error);
    const cached = getCachedUsers().find((u) => u.uid === uid);
    if (cached) {
      const localIssues = getLocalIssues();
      const userIssues = localIssues.filter((i) => i.reportedBy === uid);
      const reportedCount = userIssues.length;
      const inProgressCount = userIssues.filter((i) => i.status === "in_progress").length;
      const resolvedCount = userIssues.filter((i) => i.status === "resolved").length;
      const points = (reportedCount * 5) + (inProgressCount * 5) + (resolvedCount * 10);
      return { 
        ...cached, 
        points, 
        issuesReported: reportedCount, 
        issuesResolved: resolvedCount 
      };
    }
    return null;
  }
}

export async function createOrUpdateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  try {
    const userRef = doc(db, "users", uid);
    const snap = await withTimeout(getDoc(userRef), 10000, "Get user profile timed out");

    if (!snap.exists()) {
      const newProfile = {
        uid,
        points: 0,
        level: "Citizen",
        badges: [],
        streak: 0,
        issuesReported: 0,
        issuesVerified: 0,
        issuesResolved: 0,
        createdAt: Date.now(),
        ...data,
      };
      await withTimeout(setDoc(userRef, newProfile), 2000, "Create user profile timed out");
      cacheUserProfile(newProfile as UserProfile);
    } else {
      const existing = snap.data() as UserProfile;
      const updatedProfile = { ...existing, ...data };
      await withTimeout(updateDoc(userRef, data), 2000, "Update user profile timed out");
      cacheUserProfile(updatedProfile as UserProfile);
    }
  } catch (error) {
    console.warn("createOrUpdateUserProfile failed or timed out, modifying local state:", error);
    // Optimistically cache locally
    const cached = getCachedUsers().find((u) => u.uid === uid);
    if (cached) {
      cacheUserProfile({ ...cached, ...data } as UserProfile);
    } else {
      cacheUserProfile({
        uid,
        points: 0,
        level: "Citizen",
        badges: [],
        streak: 0,
        issuesReported: 0,
        issuesVerified: 0,
        issuesResolved: 0,
        createdAt: Date.now(),
        ...data,
      } as UserProfile);
    }
  }
}

export async function awardPoints(
  userId: string,
  eventType: keyof typeof POINT_EVENTS
): Promise<void> {
  const event = POINT_EVENTS[eventType];
  if (!event) return;

  try {
    const userRef = doc(db, "users", userId);
    const snap = await withTimeout(getDoc(userRef), 10000, "Get user profile timed out");
    if (!snap.exists()) return;

    const user = snap.data() as UserProfile;
    const newPoints = (user.points || 0) + event.points;
    const newLevel = getLevelFromPoints(newPoints);

    const updates: Partial<UserProfile> = {
      points: newPoints,
      level: newLevel,
    };

    // Check for new badges
    const newBadges = checkNewBadges(
      user.issuesReported || 0,
      user.issuesVerified || 0,
      user.issuesResolved || 0,
      user.streak || 0,
      newPoints,
      (user.badges || []).map((b) => b.id)
    );

    if (newBadges.length > 0) {
      updates.badges = [...(user.badges || []), ...newBadges];
    }

    await withTimeout(updateDoc(userRef, updates), 2000, "Award points timed out");
  } catch (error) {
    console.warn("awardPoints failed or timed out:", error);
  }
}

export async function getLeaderboard(
  limitCount = 20
): Promise<UserProfile[]> {
  const fallback = () => {
    const localUsers = getCachedUsers();
    const localIssues = getLocalIssues();
    const users = [...localUsers];
    localIssues.forEach((issue) => {
      if (issue.reportedBy && !users.some((u) => u.uid === issue.reportedBy)) {
        users.push({
          uid: issue.reportedBy,
          displayName: issue.reportedByName || "Citizen",
          email: "",
          points: 0,
          level: "Citizen",
          badges: [],
          streak: 0,
          issuesReported: 0,
          issuesVerified: 0,
          issuesResolved: 0,
          createdAt: issue.createdAt,
        });
      }
    });

    const stats = users.map((user) => {
      const userIssues = localIssues.filter((i) => i.reportedBy === user.uid);
      const resolvedCount = userIssues.filter((i) => i.status === "resolved").length;
      const inProgressCount = userIssues.filter((i) => i.status === "in_progress").length;
      const reportedCount = userIssues.length;

      const points = (reportedCount * 5) + (inProgressCount * 5) + (resolvedCount * 10);

      return {
        ...user,
        points,
        reportedCount,
        resolvedCount,
        inProgressCount,
        issuesReported: reportedCount,
        issuesResolved: resolvedCount,
      };
    });
    stats.sort((a, b) => {
      if ((b.resolvedCount || 0) !== (a.resolvedCount || 0)) {
        return (b.resolvedCount || 0) - (a.resolvedCount || 0);
      }
      if ((b.inProgressCount || 0) !== (a.inProgressCount || 0)) {
        return (b.inProgressCount || 0) - (a.inProgressCount || 0);
      }
      if ((b.reportedCount || 0) !== (a.reportedCount || 0)) {
        return (b.reportedCount || 0) - (a.reportedCount || 0);
      }
      return (b.points || 0) - (a.points || 0);
    });
    return stats.slice(0, limitCount);
  };

  try {
    const usersQuery = query(collection(db, "users"), limit(100));
    const issuesQuery = query(collection(db, "issues"), orderBy("createdAt", "desc"), limit(500));
    
    const [usersSnap, issuesSnap] = await Promise.all([
      withTimeout(getDocs(usersQuery), 10000, "Get users timed out"),
      withTimeout(getDocs(issuesQuery), 10000, "Get issues timed out")
    ]);
    
    const users = usersSnap.docs.map((d) => d.data() as UserProfile);
    const issues = issuesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Issue));
    
    // Cache fetched profiles
    users.forEach(cacheUserProfile);

    const usersWithStats = users.map((user) => {
      const userIssues = issues.filter((i) => i.reportedBy === user.uid);
      const resolvedCount = userIssues.filter((i) => i.status === "resolved").length;
      const inProgressCount = userIssues.filter((i) => i.status === "in_progress").length;
      const reportedCount = userIssues.length;

      const points = (reportedCount * 5) + (inProgressCount * 5) + (resolvedCount * 10);

      return {
        ...user,
        points,
        reportedCount,
        resolvedCount,
        inProgressCount,
        issuesReported: reportedCount,
        issuesResolved: resolvedCount,
      };
    });

    usersWithStats.sort((a, b) => {
      if ((b.resolvedCount || 0) !== (a.resolvedCount || 0)) {
        return (b.resolvedCount || 0) - (a.resolvedCount || 0);
      }
      if ((b.inProgressCount || 0) !== (a.inProgressCount || 0)) {
        return (b.inProgressCount || 0) - (a.inProgressCount || 0);
      }
      if ((b.reportedCount || 0) !== (a.reportedCount || 0)) {
        return (b.reportedCount || 0) - (a.reportedCount || 0);
      }
      return (b.points || 0) - (a.points || 0);
    });

    return usersWithStats.slice(0, limitCount);
  } catch (error) {
    console.warn("getLeaderboard failed or timed out, returning local cache:", error);
    return fallback();
  }
}

export function subscribeToLeaderboard(
  callback: (users: UserProfile[]) => void
): () => void {
  let latestUsers: UserProfile[] = [];
  let latestIssues: Issue[] = [];
  let hasReceivedUsers = false;
  let hasReceivedIssues = false;

  const emitLeaderboard = () => {
    const usersToUse = hasReceivedUsers ? latestUsers : getCachedUsers();
    const issuesToUse = hasReceivedIssues ? latestIssues : getLocalIssues();

    const users = [...usersToUse];
    issuesToUse.forEach((issue) => {
      if (issue.reportedBy && !users.some((u) => u.uid === issue.reportedBy)) {
        users.push({
          uid: issue.reportedBy,
          displayName: issue.reportedByName || "Citizen",
          email: "",
          points: 0,
          level: "Citizen",
          badges: [],
          streak: 0,
          issuesReported: 0,
          issuesVerified: 0,
          issuesResolved: 0,
          createdAt: issue.createdAt,
        });
      }
    });

    const usersWithStats = users.map((user) => {
      const userIssues = issuesToUse.filter((i) => i.reportedBy === user.uid);
      const resolvedCount = userIssues.filter((i) => i.status === "resolved").length;
      const inProgressCount = userIssues.filter((i) => i.status === "in_progress").length;
      const reportedCount = userIssues.length;

      const points = (reportedCount * 5) + (inProgressCount * 5) + (resolvedCount * 10);

      return {
        ...user,
        points,
        reportedCount,
        resolvedCount,
        inProgressCount,
        issuesReported: reportedCount,
        issuesResolved: resolvedCount,
      };
    });

    usersWithStats.sort((a, b) => {
      if ((b.resolvedCount || 0) !== (a.resolvedCount || 0)) {
        return (b.resolvedCount || 0) - (a.resolvedCount || 0);
      }
      if ((b.inProgressCount || 0) !== (a.inProgressCount || 0)) {
        return (b.inProgressCount || 0) - (a.inProgressCount || 0);
      }
      if ((b.reportedCount || 0) !== (a.reportedCount || 0)) {
        return (b.reportedCount || 0) - (a.reportedCount || 0);
      }
      return (b.points || 0) - (a.points || 0);
    });

    callback(usersWithStats);
  };

  // Immediate cache emit
  setTimeout(() => {
    emitLeaderboard();
  }, 0);

  let hasReceivedSnapshot = false;
  const timeoutId = setTimeout(() => {
    if (!hasReceivedSnapshot) {
      console.warn("Leaderboard subscription timed out, using fallback cache.");
      emitLeaderboard();
    }
  }, 10000);

  const usersQuery = query(collection(db, "users"), limit(100));
  const issuesQuery = query(collection(db, "issues"), orderBy("createdAt", "desc"), limit(500));
  let localUnsubscribe = () => {};

  try {
    const unsubUsers = onSnapshot(usersQuery, (snap) => {
      hasReceivedSnapshot = true;
      clearTimeout(timeoutId);
      latestUsers = snap.docs.map((d) => d.data() as UserProfile);
      latestUsers.forEach(cacheUserProfile);
      hasReceivedUsers = true;
      emitLeaderboard();
    }, (err) => {
      console.warn("Users subscription failed, operating in offline cache mode:", err);
      hasReceivedUsers = true;
      emitLeaderboard();
    });

    const unsubIssues = onSnapshot(issuesQuery, (snap) => {
      hasReceivedSnapshot = true;
      clearTimeout(timeoutId);
      latestIssues = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Issue));
      hasReceivedIssues = true;
      emitLeaderboard();
    }, (err) => {
      console.warn("Issues subscription failed, operating in offline cache mode:", err);
      hasReceivedIssues = true;
      emitLeaderboard();
    });

    localUnsubscribe = () => {
      unsubUsers();
      unsubIssues();
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn("subscribeToLeaderboard queries failed, using cache fallback:", error);
    setTimeout(() => {
      emitLeaderboard();
    }, 0);
  }

  return localUnsubscribe;
}
