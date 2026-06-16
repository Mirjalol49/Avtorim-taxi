import { Composition } from 'remotion';
import { TaksaparkPromo } from './TaksaparkPromo';

export const RemotionRoot = () => {
  return (
    <Composition
      id="TaksaparkPromo"
      component={TaksaparkPromo}
      durationInFrames={720}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
