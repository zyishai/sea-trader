import React, { useEffect, useState } from "react";
import { Box, DOMElement, measureElement, Text, useInput } from "ink";
import BigText from "ink-big-text";
import { UnorderedList } from "@inkjs/ui";
import { useAnchorToTop } from "./Viewport.js";
import { displayMonetaryValue, helpView, joinWords } from "../../game/index.js";

export function HelpScreen({ onClose }: { onClose: () => void }) {
  const help = helpView();
  const [ref, setRef] = useState<DOMElement | null>(null);
  const [width, setWidth] = useState(0);
  useAnchorToTop();

  useEffect(() => {
    if (ref) {
      const { width } = measureElement(ref);
      setWidth(width);
    }
  }, [ref]);

  useInput((input, key) => {
    if (input.toUpperCase() === "H") {
      onClose();
    } else if (key.escape) {
      process.exit();
    }
  });

  return (
    <Box width="100%" flexGrow={1} flexDirection="column" alignItems="center">
      <Box flexDirection="column" marginBottom={1} ref={setRef}>
        <BigText text="How to play" font="simple" />
        <Text>{"-".repeat(width)}</Text>
      </Box>
      <Box flexDirection="column" width={width + 10} gap={1}>
        <Text>
          It&apos;s the 1850s in the Far East. You captain a small junk with{" "}
          {displayMonetaryValue(help.startingBalance)} to your name. Trade {joinWords(help.goods)} between{" "}
          {help.portCount} ports and finish the {help.voyageLength}-day voyage as rich as you can.
        </Text>

        <Section title="Each day in port">
          <>
            Market: buy goods cheap, sell them dear. Prices differ by port and change every {help.priceUpdateDays} days.
          </>
          <>Port: set sail. A passage takes days, and storms, pirates or an uncharted island may interrupt it.</>
          <>Shipyard: repair damage, upgrade speed, defense and capacity, and hire guard ships.</>
        </Section>

        <Section title="Trading">
          <>Goods and hold space are counted in picul (about 60 kg, one porter&apos;s load).</>
          <>Ports sell what they produce below the usual price; trading hubs and large markets are cheaper overall.</>
          <>
            Seasons change every {help.seasonDays} days and push some prices up or down. Merchant tips in the market
            point out bargains, and better reputation brings better tips.
          </>
          <>
            You can overload the hold by up to {help.overloadPercent}%, but an overloaded ship sails slower and
            struggles to escape pirates.
          </>
        </Section>

        <Section title="Money">
          <>You can only buy with money you have. Debt comes from fees and costs, never from shopping.</>
          <>
            Moneylenders charge {help.interestPercent}% a day on debt, at most{" "}
            {displayMonetaryValue(help.maxDailyInterest)} a day. Below {displayMonetaryValue(help.bankruptcyAt)} you go
            bankrupt.
          </>
          <>
            Guard ships cost a daily upkeep. While you&apos;re in debt it goes unpaid and they fight at half strength.
          </>
          <>If you&apos;re in debt, or left with no cargo and no money to trade, you may declare bankruptcy.</>
        </Section>

        <Section title="Danger at sea">
          <>Pirates: attack, flee or bribe. Guard ships take most of the damage and improve your odds.</>
          <>A ship below 40% condition is a wreck and can&apos;t sail; damaged ships also sail slower.</>
          <>Events may cost you days, cargo or health, or bring treasure. Some ask you to choose.</>
        </Section>

        <Section title="End of the voyage">
          <>
            Retire from day {help.voyageLength} to see your score: your net worth plus a bonus for a bigger, faster
            ship, minus damage.
          </>
          <>
            Ranks:{" "}
            {help.ranks
              .map(({ title, minScore }) => (minScore > 0 ? `${title} ${minScore.toLocaleString("en-US")}+` : title))
              .join(", ")}
            .
          </>
          <>
            Extended mode lets you sail past day {help.voyageLength}, losing {help.extendedPenaltyPercent}% of your
            score for each extra day.
          </>
        </Section>

        <Section title="Controls">
          <>Pick options with number keys, or with arrow keys and Enter (press C on the start screen to switch).</>
          <>On the start screen, M toggles extended mode and A toggles text animations.</>
          <>Press Space to continue after a report from the crew.</>
          <>Press Esc to go back; on the main menu it asks whether to quit. Progress isn&apos;t saved.</>
          <>Scroll long screens with the mouse wheel or PgUp/PgDn.</>
        </Section>

        <Box alignSelf="center" marginTop={1}>
          <Text color="blueBright">Press H to return to game</Text>
        </Box>
      </Box>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode[] }) {
  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      <UnorderedList>
        {children.map((item, index) => (
          <UnorderedList.Item key={index}>
            <Text>{item}</Text>
          </UnorderedList.Item>
        ))}
      </UnorderedList>
    </Box>
  );
}
