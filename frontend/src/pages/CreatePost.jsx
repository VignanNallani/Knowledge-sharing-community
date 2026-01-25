

// import React, { useState } from "react";
// import api from "../api/axios";
// import { useNavigate } from "react-router-dom";

// export default function CreatePost() {
//   const [title, setTitle] = useState("");
//   const [content, setContent] = useState("");
//   const [tags, setTags] = useState("");
//   const navigate = useNavigate();

//   const submit = async (e) => {
//     e.preventDefault();
//     const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);

//     const res = await api.post("/api/posts", { title, content, tags: tagArr });
//     navigate(`/posts/${res.data.post?.id || res.data.id}`);
//   };

//   return (
//     <form onSubmit={submit} className="max-w-xl mx-auto p-6 bg-white rounded">
//       <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full p-2 border rounded mb-2" />
//       <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="w-full p-2 border rounded" />
//       <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags" className="w-full p-2 border rounded mt-2" />
//       <button className="btn btn-primary mt-3">Publish</button>
//     </form>
//   );
// }


import React, { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const tagArr = tags.split(",").map(t => t.trim()).filter(Boolean);
    const res = await api.post("/api/posts", { title, content, tags: tagArr });
    navigate(`/posts/${res.data.post?.id || res.data.id}`);
  };

  return (
    <form onSubmit={submit} className="card max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold">Create a post</h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Post title"
        className="glass-input"
        required
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        placeholder="Share your knowledge..."
        className="glass-input resize-none"
        required
      />

      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="tags (comma separated)"
        className="glass-input"
      />

      <div className="flex justify-end">
        <button className="btn btn-primary">Publish</button>
      </div>
    </form>
  );
}
