import { useLocation } from "react-router-dom";
import FeedRightPanel from "./FeedRightPanel";
import PostRightPanel from "./PostRightPanel";

export default function RightPanel() {
  const location = useLocation();

  if (location.pathname.startsWith("/posts/")) {
    return <PostRightPanel />;
  }

  return <FeedRightPanel />;
}
