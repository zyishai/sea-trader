import { Box, Text, useInput } from "ink";
import BigText from "ink-big-text";
import React from "react";
import { GameContext } from "./GameContext.js";

export function StartScreen() {
  const actor = GameContext.useActorRef();

  useInput((input, key) => {
    if (key.return) {
      actor.send({ type: "START_GAME" });
    }
  });

  return (
    <Box width="100%" height="100%" flexDirection="column" justifyContent="center" alignItems="center">
      <Text>{`
                                   ..            ........                                       
                                .....  .....  ..  .                                       
                                       .   . .........                                    
                                     .....................                                
                                ....  .................  .                                
                           .. ...........       .        ......                           
                      ...    ......   ..       ..          ..    .....                    
                          .......     ...................... ..      ....                 
                          ..  ..  .......      ..           .      .... .                 
                        ..   .....   ..        .   ......   .    .....  .                 
                       ...   ..      . ..........:.      .... .  .. .                     
                  ..  ..     . ..........     ..            ..  .  .                      
            ...      ...... ...     ..        .           .. ...  ..                      
             :===:.  ..........   . .  .........   ... .........                          
              ::===::.................     ...........  ........ .  ::..:                 
                :=====-:     ............ ......    .....     ..:--:.                     
                 :=---= ::   ... ........     .....       .  :========-::--:..            
              -: .:====.    ..............            .......===-:-========:.             
               ..:-: :.......   ...           ........        .:==--:-:::..               
                 .:=--=-: :===:-====-::-:...    ...       ::... ::=====-.                 
                   ..-============-========:::::====-===-::    ::====:.                   
                       ..::-:::..   .:-==========---==============-..                     
                                        .........    ...:------:..                        
      `}</Text>
      <Box height={2} />
      <BigText text="Sea Trader" font="simple" />
      <Text color="green">Press ENTER to begin your journey!</Text>
    </Box>
  );
}
