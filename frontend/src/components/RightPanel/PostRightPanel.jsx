import MentorCard from "../MentorCard";

export default function PostRightPanel() {
  return (
    <div className="space-y-6">

      {/* Mentorship */}
      <div className="panel rounded-xl p-4">
        <h3 className="font-semibold mb-3">Request Mentorship</h3>

        <div className="space-y-4">
          <MentorCard
            name="Rachel Wong"
            role="Senior Backend Engineer"
          />
          <MentorCard
            name="Ankit Mehta"
            role="Tech Lead · DevOps"
          />
        </div>
      </div>

      {/* Related Posts */}
      <div className="panel rounded-xl p-4">
        <h3 className="font-semibold mb-3">Related Posts</h3>

        <ul className="space-y-3 text-sm text-blue-600">
          <li className="cursor-pointer">
            Zero Downtime Deployment Tips
          </li>
          <li className="cursor-pointer">
            Optimizing SQL Queries for Scaling
          </li>
        </ul>
      </div>

    </div>
  );
}
