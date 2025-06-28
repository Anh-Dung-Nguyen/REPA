import { Info } from 'lucide-react';

function About() {
  return (
    <div>
      <h1 className="text-2xl flex items-center gap-2">
        <Info size = {28} /> About Us
      </h1>
      <p>Welcome to our app...</p>
    </div>
  );
}

export default About;