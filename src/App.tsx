import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CVUpload from "./coponents/CvUpload";
import SkillsReview from "./coponents/SkillsReview";
import AddSkills from "./coponents/ManualSkills"; 
import Loading from "./coponents/Loading";
import TimeAvailability from "./coponents/TimeAvailability";
import CareerGoal from "./coponents/CareerGoal";
import GitHubUser from "./coponents/GitHubUser";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/github-user" />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/upload" element={<CVUpload />} />
        <Route path="/skills-review" element={<SkillsReview />} />
        <Route path="/availability" element={<TimeAvailability />} />
        <Route path="/career-goal" element={<CareerGoal />} />
        <Route path="/github-user" element={<GitHubUser />} />
        <Route path="/add-skills" element={<AddSkills onSubmit={(skills) => console.log(skills)} />}/> </Routes>
    </BrowserRouter>
  );
}