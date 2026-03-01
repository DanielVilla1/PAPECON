import { useAuthContext } from "../context/AuthContext";

/**
 * Convenience hook that re-exports the auth context.
 */
export default function useAuth() {
  return useAuthContext();
}
