import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

const ParticleBackground = () => {
  const particlesInit = async (main) => {
    await loadFull(main);
  };

  const importAll = (r) => r.keys().map((key) => ({
    src: r(key),
    width: 5000,
    height: 5000,
  }));
  
  const albumImages = importAll(require.context('../images/album_covers', false, /\.(png|jpe?g|svg)$/));
  

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={{
        fullScreen: { enable: true },
        
        particles: {
          color: { value: "#ffffff" },
          links: {
            color: "#ffffff",
            distance: 100,
            enable: true,
            opacity: 0.5,
            width: 2,
          },
          move: {
            enable: true,
            speed: 2,
          },
          number: {
            value: 80,
          },
          opacity: {
            value: 0.5,
          },
          shape: {
            type: "image",
            image: albumImages,
          },
          size: {
            value: { min: 5, max: 20 },
          }, 
        },
      }}
    />
  );
};

export default ParticleBackground;
