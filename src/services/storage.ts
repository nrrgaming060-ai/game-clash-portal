import { getBucket } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadFile(path: string, file: File): Promise<string> {
  const storageRef = ref(getBucket(), `${path}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
