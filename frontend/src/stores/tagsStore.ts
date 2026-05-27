import { atom } from "nanostores";
import { tagsApi } from "../services/api";

export interface Tag {
  id: number;
  name: string;
  color: string;
  description?: string;
  created_at?: string;
}

export const $tags = atom<Tag[]>([]);
export const $loading = atom<boolean>(false);

export async function fetchTags() {
  $loading.set(true);
  try {
    const tags = await tagsApi.getAll();
    $tags.set(tags);
  } catch (error) {
    console.error("Failed to fetch tags:", error);
  } finally {
    $loading.set(false);
  }
}

export function setTags(tags: Tag[]) {
  $tags.set(tags);
}

export function addTag(tag: Tag) {
  $tags.set([...$tags.get(), tag]);
}

export function updateTag(id: number, updates: Partial<Tag>) {
  $tags.set(
    $tags.get().map((tag) => (tag.id === id ? { ...tag, ...updates } : tag)),
  );
}

export function removeTag(id: number) {
  $tags.set($tags.get().filter((tag) => tag.id !== id));
}

