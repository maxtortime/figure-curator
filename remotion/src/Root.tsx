import React from 'react';
import { Composition } from 'remotion';
import { W, H, FPS } from './tokens';
import { Search01 } from './videos/Search01';
import { Filter02 } from './videos/Filter02';
import { Groups03 } from './videos/Groups03';
import { Edit04 }   from './videos/Edit04';
import { Select05 } from './videos/Select05';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Search01"
        component={Search01}
        durationInFrames={630}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="Filter02"
        component={Filter02}
        durationInFrames={540}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="Groups03"
        component={Groups03}
        durationInFrames={570}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="Edit04"
        component={Edit04}
        durationInFrames={540}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="Select05"
        component={Select05}
        durationInFrames={510}
        fps={FPS}
        width={W}
        height={H}
      />
    </>
  );
};
