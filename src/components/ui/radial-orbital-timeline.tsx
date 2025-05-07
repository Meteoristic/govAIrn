
"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Link } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: React.ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
  timelineData,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
    {}
  );
  const [viewMode, setViewMode] = useState<"orbital">("orbital");
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setPulseEffect({});
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (parseInt(key) !== id) {
          newState[parseInt(key)] = false;
        }
      });

      newState[id] = !prev[id];

      if (!prev[id]) {
        setActiveNodeId(id);
        setAutoRotate(false);

        const relatedItems = getRelatedItems(id);
        const newPulseEffect: Record<number, boolean> = {};
        relatedItems.forEach((relId) => {
          newPulseEffect[relId] = true;
        });
        setPulseEffect(newPulseEffect);

        centerViewOnNode(id);
      } else {
        setActiveNodeId(null);
        setAutoRotate(true);
        setPulseEffect({});
      }

      return newState;
    });
  };

  useEffect(() => {
    let rotationTimer: NodeJS.Timeout;

    if (autoRotate && viewMode === "orbital") {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.3) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
  }, [autoRotate, viewMode]);

  const centerViewOnNode = (nodeId: number) => {
    if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 180; // Reduced radius to provide more space
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.4,
      Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
    );

    return { x, y, angle, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    const relatedItems = getRelatedItems(activeNodeId);
    return relatedItems.includes(itemId);
  };

  const getStatusStyles = (status: TimelineItem["status"]): string => {
    switch (status) {
      case "completed":
        return "text-phosphor bg-indigo border-indigo";
      case "in-progress":
        return "text-phosphor bg-cyan border-cyan";
      case "pending":
        return "text-phosphor bg-gold/80 border-gold/80";
      default:
        return "text-phosphor bg-silver/40 border-silver/50";
    }
  };

  return (
    <div
      className="w-full h-[600px] flex flex-col items-center justify-center bg-transparent overflow-hidden"
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
        <div
          className="absolute w-full h-full flex items-center justify-center"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          {/* Central element */}
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-indigo via-cyan to-gold animate-pulse flex items-center justify-center z-10">
            <div className="absolute w-20 h-20 rounded-full border border-silver/20 animate-ping opacity-70"></div>
            <div
              className="absolute w-24 h-24 rounded-full border border-silver/10 animate-ping opacity-50"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div className="w-10 h-10 rounded-full bg-phosphor/80 backdrop-blur-md flex items-center justify-center">
              <span className="text-xs font-semibold text-graphite">govAI</span>
            </div>
          </div>

          {/* Orbit path */}
          <div className="absolute w-[360px] h-[360px] rounded-full border border-silver/10"></div>

          {/* Timeline nodes */}
          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const isPulsing = pulseEffect[item.id];
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 200 : position.zIndex,
              opacity: isExpanded ? 1 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => (nodeRefs.current[item.id] = el)}
                className="absolute transition-all duration-700 cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                {/* Pulsing effect */}
                <div
                  className={`absolute rounded-full -inset-1 ${
                    isPulsing ? "animate-pulse duration-1000" : ""
                  }`}
                  style={{
                    background: `radial-gradient(circle, rgba(80, 93, 255, 0.2) 0%, rgba(80, 93, 255, 0) 70%)`,
                    width: "50px",
                    height: "50px",
                    left: "-15px",
                    top: "-15px",
                  }}
                ></div>

                {/* Icon node */}
                <div
                  className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  ${
                    isExpanded
                      ? "bg-phosphor text-graphite"
                      : isRelated
                      ? "bg-cyan text-graphite"
                      : "bg-graphite text-phosphor"
                  }
                  border-2 
                  ${
                    isExpanded
                      ? "border-indigo shadow-lg glow-indigo"
                      : isRelated
                      ? "border-cyan animate-pulse glow"
                      : "border-silver/40"
                  }
                  transition-all duration-300 transform
                  ${isExpanded ? "scale-125" : ""}
                `}
                >
                  <Icon size={20} />
                </div>

                {/* Step number and title */}
                <div
                  className={`
                  absolute top-14 whitespace-nowrap text-center w-32 -left-10
                  transition-all duration-300
                  ${isExpanded ? "text-phosphor scale-110" : "text-silver/70"}
                `}
                >
                  <div className="font-semibold text-xs mb-1">Step {item.id}</div>
                  <div className="font-medium text-sm">{item.title}</div>
                </div>

                {/* Expanded card with details */}
                {isExpanded && (
                  <Card className="absolute top-24 left-1/2 -translate-x-1/2 w-72 bg-graphite/90 backdrop-blur-lg border-silver/30 shadow-xl shadow-indigo/10 overflow-visible z-50">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-cyan/50"></div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-center items-center">
                        <Badge
                          variant="outline"
                          className="px-3 py-1 text-xs border-indigo/30 bg-indigo/10 text-phosphor"
                        >
                          Step {item.id}: {item.title}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-2 text-phosphor text-center">
                        {item.date}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-silver/90">
                      <p className="mb-4">{item.content}</p>

                      {item.relatedIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-silver/10">
                          <div className="flex items-center mb-2">
                            <Link size={12} className="text-silver/70 mr-2" />
                            <h4 className="text-xs uppercase tracking-wider font-medium text-silver/70">
                              Next Steps
                            </h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.relatedIds.map((relatedId) => {
                              const relatedItem = timelineData.find(
                                (i) => i.id === relatedId
                              );
                              if (!relatedItem) return null;
                              return (
                                <Button
                                  key={relatedId}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center h-7 px-3 py-0 text-xs rounded-full border-silver/20 bg-transparent hover:bg-indigo/10 hover:border-indigo/30 text-silver/80 hover:text-phosphor transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(relatedId);
                                  }}
                                >
                                  Step {relatedItem.id}: {relatedItem.title}
                                  <ArrowRight
                                    size={10}
                                    className="ml-1 text-silver/60"
                                  />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
