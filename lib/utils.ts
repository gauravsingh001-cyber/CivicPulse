// Utility functions

export function formatDistanceToNow(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/jpeg;base64, prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function generateIssueTitle(category: string, address: string): string {
  const categoryLabels: Record<string, string> = {
    pothole: "Pothole",
    water_leakage: "Water Leakage",
    streetlight: "Broken Streetlight",
    waste_management: "Waste Issue",
    road_damage: "Road Damage",
    drainage: "Drainage Problem",
    public_property: "Public Property Damage",
    other: "Community Issue",
  };

  const label = categoryLabels[category] || "Community Issue";
  const shortAddress = address.split(",")[0].trim();
  return `${label} at ${shortAddress}`;
}

export const DEMO_ISSUES = [
  {
    id: "demo-1",
    title: "Large pothole causing accidents near market",
    description: "There is a dangerous pothole near the main market that has caused multiple vehicle accidents.",
    category: "pothole" as const,
    severity: 5 as const,
    status: "in_progress" as const,
    location: { lat: 28.6139, lng: 77.2090, address: "Connaught Place, New Delhi", ward: "Ward 12" },
    media: [],
    reportedBy: "user1",
    reportedByName: "Raj Kumar",
    verifiedBy: ["u1", "u2", "u3", "u4"],
    upvotes: 47,
    upvotedBy: [],
    department: "PWD" as const,
    comments: [],
    statusHistory: [
      { status: "reported" as const, updatedBy: "user1", updatedByName: "Raj Kumar", timestamp: Date.now() - 86400000 * 3 },
      { status: "verified" as const, updatedBy: "system", updatedByName: "Community", timestamp: Date.now() - 86400000 * 2 },
      { status: "in_progress" as const, updatedBy: "admin", updatedByName: "PWD Officer", timestamp: Date.now() - 86400000 },
    ],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: "demo-2",
    title: "Street light not working for 2 weeks",
    description: "The streetlight at the intersection has been non-functional for 2 weeks causing safety concerns.",
    category: "streetlight" as const,
    severity: 3 as const,
    status: "verified" as const,
    location: { lat: 28.6200, lng: 77.2150, address: "Rajpath, New Delhi", ward: "Ward 8" },
    media: [],
    reportedBy: "user2",
    reportedByName: "Priya Singh",
    verifiedBy: ["u1", "u2", "u3"],
    upvotes: 23,
    upvotedBy: [],
    department: "Electricity Board" as const,
    comments: [],
    statusHistory: [
      { status: "reported" as const, updatedBy: "user2", updatedByName: "Priya Singh", timestamp: Date.now() - 86400000 * 5 },
      { status: "verified" as const, updatedBy: "system", updatedByName: "Community", timestamp: Date.now() - 86400000 * 4 },
    ],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: "demo-3",
    title: "Water pipeline burst flooding the road",
    description: "Major water pipeline burst causing road flooding and water wastage.",
    category: "water_leakage" as const,
    severity: 5 as const,
    status: "resolved" as const,
    location: { lat: 28.6080, lng: 77.2200, address: "India Gate Area, New Delhi", ward: "Ward 5" },
    media: [],
    reportedBy: "user3",
    reportedByName: "Amit Sharma",
    verifiedBy: ["u1", "u2", "u3", "u4", "u5"],
    upvotes: 89,
    upvotedBy: [],
    department: "Water Supply Board" as const,
    comments: [],
    statusHistory: [],
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 2,
    resolvedAt: Date.now() - 86400000 * 2,
  },
];

export function getGovEmailByLocation(address: string, ward?: string): string {
  const lowerAddress = (address || "").toLowerCase();
  const lowerWard = (ward || "").toLowerCase();
  
  // Example predefined mappings for presentation
  if (lowerAddress.includes("marhaura") || lowerAddress.includes("841418") || lowerAddress.includes("saran")) {
    return "dm-saran.bih@nic.in"; // Fallback to Saran DM
  }
  if (lowerAddress.includes("patna")) {
    return "pmc-bih@nic.in";
  }
  if (lowerAddress.includes("mumbai") || lowerAddress.includes("andheri") || lowerAddress.includes("bandra")) {
    return "mcgm.grievance@mcgm.gov.in";
  }
  if (lowerAddress.includes("delhi") || lowerAddress.includes("new delhi") || lowerWard.includes("delhi")) {
    return "grievance@mcd.nic.in";
  }
  if (lowerAddress.includes("bengaluru") || lowerAddress.includes("bangalore")) {
    return "comm@bbmp.gov.in";
  }

  // National / State Fallback
  return "public.grievance@gov.in"; 
}

export function getGovTwitterHandleByLocation(address: string, ward?: string): string {
  const lowerAddress = (address || "").toLowerCase();
  
  if (lowerAddress.includes("marhaura") || lowerAddress.includes("841418") || lowerAddress.includes("saran")) {
    return "@SaranDm"; 
  }
  if (lowerAddress.includes("patna")) {
    return "@pmc_patna";
  }
  if (lowerAddress.includes("mumbai") || lowerAddress.includes("andheri") || lowerAddress.includes("bandra")) {
    return "@mybmc";
  }
  if (lowerAddress.includes("delhi") || lowerAddress.includes("new delhi")) {
    return "@MCD_Delhi";
  }
  if (lowerAddress.includes("bengaluru") || lowerAddress.includes("bangalore")) {
    return "@BBMPCOMM";
  }

  // National Fallback
  return "@PMOIndia"; 
}

export function compressImage(file: File, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        } else {
          resolve(img.src);
        }
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}
