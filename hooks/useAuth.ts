"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { createOrUpdateUserProfile, getUserProfile } from "@/lib/firestore";
import { UserProfile } from "@/types";

function profileFromFirebaseUser(firebaseUser: User): UserProfile {
  return {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || "Anonymous",
    email: firebaseUser.email || "",
    photoURL: firebaseUser.photoURL || undefined,
    points: 0,
    level: "Citizen",
    badges: [],
    streak: 0,
    issuesReported: 0,
    issuesVerified: 0,
    issuesResolved: 0,
    createdAt: Date.now(),
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety fallback: if Firebase Auth hangs for more than 5 seconds, stop loading so the UI doesn't freeze.
    const fallbackTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(fallbackTimeout);
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const fallbackProfile = profileFromFirebaseUser(firebaseUser);
        setUserProfile(fallbackProfile);
        setLoading(false); // Instantly resolve loading state for fast page renders!

        // Load rich profile details asynchronously in the background
        void (async () => {
          try {
            let profile = await getUserProfile(firebaseUser.uid);
            if (!profile) {
              await createOrUpdateUserProfile(firebaseUser.uid, {
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || "Anonymous",
                email: firebaseUser.email || "",
                photoURL: firebaseUser.photoURL || undefined,
              });
              profile = await getUserProfile(firebaseUser.uid);
            }
            if (profile) {
              setUserProfile(profile);
            }
          } catch (error) {
            console.warn("Background profile sync skipped:", error);
          }
        })();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });
    try {
      await createOrUpdateUserProfile(result.user.uid, {
        uid: result.user.uid,
        displayName,
        email,
      });
    } catch (error) {
      console.warn("Profile creation skipped:", error);
    }
    return result.user;
  };

  const logout = () => signOut(auth);

  const refreshProfile = async () => {
    if (user) {
      try {
        const profile = await getUserProfile(user.uid);
        setUserProfile(profile || profileFromFirebaseUser(user));
      } catch (error) {
        console.warn("Profile refresh skipped:", error);
        setUserProfile(profileFromFirebaseUser(user));
      }
    }
  };

  return {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    logout,
    refreshProfile,
  };
}
