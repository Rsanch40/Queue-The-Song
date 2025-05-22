import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

import {useCallback, useEffect, useState } from "react";


  // ✅ Define this before it's used
function getImageCount(width) {
  if (width < 640) return 20;
  if (width < 1024) return 60;
  return 20;
}

const ParticleBackground = () => {

  const [imageCount, setImageCount] = useState(getImageCount(window.innerWidth));
    const importAll = (r) => r.keys().map((key) => ({
    src: r(key),
    width: 5000,
    height: 5000,
  }));
  
  const albumImages = importAll(require.context('../images/album_covers', false, /\.(png|jpe?g|svg)$/));

  useEffect(() => {
    const handleResize = () => {
      setImageCount(getImageCount(window.innerWidth));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  const options = {
    fullScreen: { enable: true },
    particles: {
      links: {
        color: "#ffffff",
        distance: 200,
        enable: true,
        opacity: 0.5,
        width: 2,
      },
      number: {
        value: imageCount,
        density: { enable: true, area: 500 },
      },
      shape: {
        type: "image",
        image: albumImages,
      },
      size: {
        value: { min: 20, max: 40 },
      },
      move: {
        enable: true,
        speed: 1.5,
      },
    },
    detectRetina: true,
  };

  return <Particles id="tsparticles" init={particlesInit} options={options} />;
}


export default ParticleBackground;
