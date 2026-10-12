import React, { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box, DOMElement, Key, measureElement, Text, useInput, useStdout } from "ink";
import { mouseWheel, setMouseTracking } from "../terminal.js";

const WHEEL_STEP = 2;
const MEASURE_INTERVAL_MS = 100;

export const isScrollKey = (key: Key) => key.pageUp || key.pageDown;

const ViewportContext = createContext({ setAnchoredToTop: (_anchored: boolean) => {} });

/** Opens the calling screen scrolled to the top instead of following its latest content at the bottom. */
export function useAnchorToTop() {
  const { setAnchoredToTop } = useContext(ViewportContext);

  useLayoutEffect(() => {
    setAnchoredToTop(true);
    return () => setAnchoredToTop(false);
  }, [setAnchoredToTop]);
}

export function Viewport({ height, children }: React.PropsWithChildren<{ height: number }>) {
  const { stdout } = useStdout();
  const [content, setContent] = useState<DOMElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [offset, setOffset] = useState(0);
  const [followBottom, setFollowBottom] = useState(true);
  const anchoredToTop = useRef(false);

  const scrollable = contentHeight > height;
  const viewportHeight = scrollable ? height - 1 : height;
  const maxOffset = Math.max(0, contentHeight - viewportHeight);
  const visibleOffset = followBottom ? maxOffset : Math.min(offset, maxOffset);

  const controls = useMemo(
    () => ({
      setAnchoredToTop: (anchored: boolean) => {
        anchoredToTop.current = anchored;
        setOffset(0);
        setFollowBottom(!anchored);
      },
    }),
    [],
  );

  const scrollBy = (delta: number) => {
    const next = Math.min(Math.max(visibleOffset + delta, 0), maxOffset);
    setOffset(next);
    setFollowBottom(next === maxOffset);
  };

  // Children re-render independently of the viewport, so their height is polled rather than measured on render.
  useEffect(() => {
    if (!content) return;
    const measure = () => setContentHeight(measureElement(content).height);
    measure();
    const id = setInterval(measure, MEASURE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [content]);

  useInput((_, key) => {
    if (key.pageUp) scrollBy(-(viewportHeight - 1));
    else if (key.pageDown) scrollBy(viewportHeight - 1);
    else if (!anchoredToTop.current) setFollowBottom(true);
  });

  useEffect(() => {
    const onScroll = (direction: number) => scrollBy(direction * WHEEL_STEP);
    mouseWheel.on("scroll", onScroll);
    return () => void mouseWheel.off("scroll", onScroll);
  });

  useEffect(() => {
    if (!scrollable) return;
    setMouseTracking(stdout, true);
    return () => void setMouseTracking(stdout, false);
  }, [scrollable, stdout]);

  return (
    <Box flexDirection="column" width="100%" height={height}>
      <Box flexDirection="column" height={viewportHeight} overflowY="hidden">
        <Box
          ref={setContent}
          flexDirection="column"
          flexShrink={0}
          width="100%"
          minHeight={viewportHeight}
          marginTop={-visibleOffset}
        >
          <ViewportContext.Provider value={controls}>{children}</ViewportContext.Provider>
        </Box>
      </Box>
      {scrollable ? <ScrollHint linesAbove={visibleOffset} linesBelow={maxOffset - visibleOffset} /> : null}
    </Box>
  );
}

function ScrollHint({ linesAbove, linesBelow }: { linesAbove: number; linesBelow: number }) {
  return (
    <Box justifyContent="center" gap={2}>
      <Text dimColor={linesAbove === 0}>▲ {linesAbove} more</Text>
      <Text dimColor>Scroll: mouse wheel or PgUp/PgDn</Text>
      <Text dimColor={linesBelow === 0}>▼ {linesBelow} more</Text>
    </Box>
  );
}
