import React from "react";
import { Box, Text, useInput } from "ink";
import { useScreenSize } from "./hooks/use-screen-size.js";
import BigText from "ink-big-text";

export const App: React.FC<{ fullscreen?: boolean }> = ({ fullscreen = true }) => {
  const { width, height } = useScreenSize();
  // const [query, setQuery] = useState("");

  useInput((input, key) => {
    if (key.return) {
      process.exit();
    }
  });

  return (
    <Box
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      width={width}
      height={fullscreen ? height : undefined}
    >
      <Text color={"green"}>{`
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
      <BigText text="Sea Trader" font="simple" colors={["green"]} />
      <Text color="green">Press ENTER to continue</Text>
    </Box>
  );
};
