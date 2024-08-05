import { useEffect, useRef, useState } from 'react';

import {
  ArrowDownwardOutlined,
  ArrowDropUp as ArrowUp,
  SmsRounded as ChatIcon,
  InfoOutlined,
  Remove as RemoveIcon,
  Settings,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Fab,
  Fade,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { useDispatch, useSelector } from 'react-redux';

import DiscoveryIcon from '@/assets/svg/add-block2.svg';
import NavigationIcon from '@/assets/svg/Navigation.svg';

import { MESSAGE_ROLE, MESSAGE_TYPES } from '@/constants/bots';

import CenterChatContentNoMessages from './CenterChatContentNoMessages';
import ChatHistory from './ChatHistory';
import ChatSpinner from './ChatSpinner';
import DefaultPrompts from './DefaultPrompts';
import DiscoveryLibraryUI from './DiscoveryLibraryUI';
import Message from './Message';
import QuickActionButton from './QuickActionButton';
import styles from './styles';

import {
  openInfoChat,
  resetChat,
  setChatSession,
  setError,
  setFullyScrolled,
  setInput,
  setMessages,
  setMore,
  setSessionLoaded,
  setStreaming,
  setStreamingDone,
  setTyping,
} from '@/redux/slices/chatSlice';
import { firestore } from '@/redux/store';
import createChatSession from '@/services/chatbot/createChatSession';
import generatePrompts from '@/services/chatbot/generatePrompts';
import sendMessage from '@/services/chatbot/sendMessage';

const ChatInterface = () => {
  const messagesContainerRef = useRef();

  const dispatch = useDispatch();
  const {
    more,
    input,
    typing,
    chat,
    sessionLoaded,
    openSettingsChat,
    infoChatOpened,
    fullyScrolled,
    streamingDone,
    streaming,
    error,
  } = useSelector((state) => state.chat);
  const { data: userData } = useSelector((state) => state.user);

  const sessionId = localStorage.getItem('sessionId');

  const currentSession = chat;
  const chatMessages = currentSession?.messages;
  const showNewMessageIndicator = !fullyScrolled && streamingDone;
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [defaultPrompts, setDefaultPrompts] = useState([]);
  const [showPrompts, setShowPrompts] = useState(true);
  const [showDiscovery, setShowDiscovery] = useState(false);

  const startConversation = async (message) => {
    // Optionally dispatch a temporary message for the user's input
    dispatch(
      setMessages({
        role: MESSAGE_ROLE.HUMAN,
        message,
      })
    );
    dispatch(setTyping(true));

    // Define the chat payload
    const chatPayload = {
      user: {
        id: userData?.id,
        fullName: userData?.fullName,
        email: userData?.email,
      },
      type: 'chat',
      message,
    };

    // Send a chat session
    const { status, data } = await createChatSession(chatPayload, dispatch);

    // Remove typing bubble
    dispatch(setTyping(false));
    if (status === 'created') dispatch(setStreaming(true));

    // Set chat session
    dispatch(setChatSession(data));
    dispatch(setSessionLoaded(true));
  };

  const handleDefaultPrompts = async (userId) => {
    const document = doc(firestore, 'users', userId);
    const userInfo = await getDoc(document);
    const data = userInfo.data();

    const prompts = await generatePrompts(data);
    const suggestions = prompts.data.data[0].payload.text;

    const suggestionsList = suggestions.split('\n');
    suggestionsList.forEach((suggestion, index) => {
      suggestionsList[index] = suggestion
        .substring(3)
        .replace(
          /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
          ''
        ); // remove emojis
    });

    setDefaultPrompts(suggestionsList);
  };

  useEffect(() => {
    if (chatMessages?.length === 0 || !chatMessages)
      handleDefaultPrompts(userData.id);
    return () => {
      localStorage.removeItem('sessionId');
      dispatch(resetChat());
    };
  }, []);

  useEffect(() => {
    let unsubscribe;

    if (sessionLoaded || currentSession) {
      messagesContainerRef.current?.scrollTo(
        0,
        messagesContainerRef.current?.scrollHeight,
        {
          behavior: 'smooth',
        }
      );

      const sessionRef = query(
        collection(firestore, 'chatSessions'),
        where('id', '==', sessionId)
      );

      unsubscribe = onSnapshot(sessionRef, async (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const updatedData = change.doc.data();
            const updatedMessages = updatedData.messages;

            const lastMessage = updatedMessages[updatedMessages.length - 1];
            const { timestamp } = lastMessage;
            lastMessage.timestamp = {
              seconds: timestamp.seconds,
              nanoseconds: timestamp.nanoseconds,
            };
            if (lastMessage?.role === MESSAGE_ROLE.AI) {
              dispatch(
                setMessages({
                  role: MESSAGE_ROLE.AI,
                  response: lastMessage,
                })
              );
              dispatch(setTyping(false));
            }
          }
        });
      });
    }

    return () => {
      if (sessionLoaded || currentSession) unsubscribe();
    };
  }, [currentSession, sessionLoaded]);

  const handleOnScroll = () => {
    const scrolled =
      Math.abs(
        messagesContainerRef.current.scrollHeight -
          messagesContainerRef.current.clientHeight -
          messagesContainerRef.current.scrollTop
      ) <= 1;

    if (fullyScrolled !== scrolled) dispatch(setFullyScrolled(scrolled));
  };

  const handleScrollToBottom = () => {
    messagesContainerRef.current?.scrollTo(
      0,
      messagesContainerRef.current?.scrollHeight,
      {
        behavior: 'smooth',
      }
    );

    dispatch(setStreamingDone(false));
  };

  const handleSendMessage = async () => {
    dispatch(setStreaming(true));

    if (!input) {
      dispatch(setError('Please enter a message'));
      setTimeout(() => {
        dispatch(setError(null));
      }, 3000);
      return;
    }

    const message = {
      role: MESSAGE_ROLE.HUMAN,
      type: MESSAGE_TYPES.TEXT,
      payload: {
        text: input,
      },
    };

    if (!chatMessages) {
      await startConversation(message);
      return;
    }

    dispatch(
      setMessages({
        role: MESSAGE_ROLE.HUMAN,
      })
    );

    dispatch(setTyping(true));

    await sendMessage({ message, id: sessionId }, dispatch);
  };

  const handleQuickReply = async (option) => {
    dispatch(setInput(option));
    dispatch(setStreaming(true));

    const message = {
      role: MESSAGE_ROLE.HUMAN,
      type: MESSAGE_TYPES.QUICK_REPLY,
      payload: {
        text: option,
      },
    };

    if (!chatMessages) {
      // Start a new conversation if there are no existing messages
      await startConversation(message);
      return;
    }

    dispatch(
      setMessages({
        role: MESSAGE_ROLE.HUMAN,
        message,
      })
    );
    dispatch(setTyping(true));

    // Ensure the user’s message is displayed before sending the message
    setTimeout(async () => {
      await sendMessage({ message, id: sessionId }, dispatch);
    }, 0);
  };

  const handleSelectPrompt = async (prompt) => {
    dispatch(setInput(prompt));
    dispatch(setTyping(true));

    setTimeout(async () => {
      const message = {
        role: MESSAGE_ROLE.HUMAN,
        type: MESSAGE_TYPES.TEXT,
        payload: {
          text: prompt,
        },
      };
      if (!chatMessages) {
        await startConversation(message);
      } else {
        dispatch(
          setMessages({
            role: MESSAGE_ROLE.HUMAN,
          })
        );
        await sendMessage({ message, id: sessionId }, dispatch);
      }
      dispatch(setTyping(false));
    }, 500);
  };

  /* Push Enter */
  const keyDownHandler = async (e) => {
    if (typing || !input || streaming) return;
    if (e.keyCode === 13) handleSendMessage();
  };

  const renderSendIcon = () => {
    return (
      <InputAdornment position="end">
        <IconButton
          onClick={handleSendMessage}
          {...styles.bottomChatContent.iconButtonProps(
            typing || error || !input || streaming
          )}
        >
          <NavigationIcon />
        </IconButton>
      </InputAdornment>
    );
  };

  const handleShowChatHistory = () => {
    setShowChatHistory(!showChatHistory);
    setShowDiscovery(false);
  };

  const renderMoreChat = () => {
    if (!more) return null;
    return (
      <Grid {...styles.moreChat.moreChatProps}>
        <Grid {...styles.moreChat.contentMoreChatProps}>
          <Settings {...styles.moreChat.iconProps} />
          <Typography {...styles.moreChat.titleProps}>Settings</Typography>
        </Grid>
        <Grid
          {...styles.moreChat.contentMoreChatProps}
          onClick={() => dispatch(openInfoChat())}
        >
          <InfoOutlined {...styles.moreChat.iconProps} />
          <Typography {...styles.moreChat.titleProps}>Information</Typography>
        </Grid>
      </Grid>
    );
  };

  const renderCenterChatContent = () => {
    if (
      !openSettingsChat &&
      !infoChatOpened &&
      chatMessages?.length !== 0 &&
      !!chatMessages
    )
      return (
        <Grid
          onClick={() => dispatch(setMore({ role: 'shutdown' }))}
          {...styles.centerChat.centerChatGridProps}
        >
          <Grid
            ref={messagesContainerRef}
            onScroll={handleOnScroll}
            {...styles.centerChat.messagesGridProps}
          >
            {chatMessages?.map(
              (message, index) =>
                message?.role !== MESSAGE_ROLE.SYSTEM && (
                  <Message
                    ref={messagesContainerRef}
                    {...message}
                    messagesLength={chatMessages?.length}
                    messageNo={index + 1}
                    onQuickReply={handleQuickReply}
                    streaming={streaming}
                    fullyScrolled={fullyScrolled}
                    key={index}
                  />
                )
            )}
            {typing && <ChatSpinner />}
          </Grid>
        </Grid>
      );

    return null;
  };

  const renderCenterChatContentNoMessages = () => {
    if ((chatMessages?.length === 0 || !chatMessages) && !infoChatOpened)
      return <CenterChatContentNoMessages />;
    return null;
  };

  const renderNewMessageIndicator = () => {
    return (
      <Fade in={showNewMessageIndicator}>
        <Button
          startIcon={<ArrowDownwardOutlined />}
          onClick={handleScrollToBottom}
          {...styles.newMessageButtonProps}
        />
      </Fade>
    );
  };

  const renderQuickAction = () => {
    return (
      <InputAdornment position="start">
        <Grid {...styles.bottomChatContent.bottomChatContentGridProps}>
          <QuickActionButton
            defaultText="Actions"
            setShowPrompts={setShowPrompts}
          />
        </Grid>
      </InputAdornment>
    );
  };

  const renderBottomChatContent = () => {
    if (!openSettingsChat && !infoChatOpened) {
      return (
        <Grid {...styles.bottomChatContent.bottomChatContentGridProps}>
          {(chatMessages?.length === 0 || !chatMessages) && showPrompts ? (
            <DefaultPrompts
              onSelect={(prompt) => {
                handleSelectPrompt(prompt);
              }}
              prompts={defaultPrompts}
            />
          ) : null}
          <Grid {...styles.bottomChatContent.chatInputGridProps(!!error)}>
            <TextField
              value={input}
              onChange={(e) => dispatch(setInput(e.currentTarget.value))}
              onKeyUp={keyDownHandler}
              error={!!error}
              helperText={error}
              disabled={!!error}
              focused={false}
              {...styles.bottomChatContent.chatInputProps(
                renderQuickAction,
                renderSendIcon,
                !!error,
                input
              )}
            />
          </Grid>
        </Grid>
      );
    }
    return null;
  };

  const renderChatHistoryButton = () => {
    return (
      <div>
        <Fab
          aria-label="open chat history"
          size="medium"
          {...(!showChatHistory
            ? styles.chatHistory.chatHistoryButtonFabProps
            : styles.chatHistory.chatHistoryButtonFabPropsHide)}
          onClick={handleShowChatHistory}
        >
          <ArrowUp {...styles.chatHistory.chatHistoryButtonIconProps} />
        </Fab>
      </div>
    );
  };

  const renderChatHistory = () => {
    return (
      <Paper
        {...(showChatHistory
          ? styles.chatHistory.chatHistoryContainerProps
          : styles.chatHistory.chatHistoryContainerClose)}
      >
        {showChatHistory ? (
          <>
            <div {...styles.chatHistory.chatHistoryTitleContainerProps}>
              <Typography {...styles.chatHistory.chatHistoryTitleProps}>
                Chat History
              </Typography>
              <IconButton
                {...styles.chatHistory.closeButtonProps}
                onClick={handleShowChatHistory}
              >
                <RemoveIcon />
              </IconButton>
            </div>
            <ChatHistory
              user={{
                email: userData.email,
                fullName: userData.fullName,
                id: userData.id,
              }}
            />
          </>
        ) : null}
      </Paper>
    );
  };

  const testRender = () => {
    return (
      <Box {...styles.topBar.barProps}>
        <Button
          variant="outlined"
          startIcon={<ChatIcon />}
          onClick={() => {
            localStorage.removeItem('sessionId');
            dispatch(resetChat());
          }}
          {...styles.actionButtonProps}
        >
          Chat
        </Button>
        <Button
          variant="outlined"
          startIcon={<DiscoveryIcon />}
          {...styles.actionButtonProps}
          onClick={() => {
            setShowDiscovery(!showDiscovery);
            setShowChatHistory(false);
          }}
        >
          Discovery
        </Button>
      </Box>
    );
  };

  const renderDiscoveryLibrary = () => {
    return (
      <DiscoveryLibraryUI
        show={showDiscovery}
        handleSendMessage={handleSelectPrompt}
      />
    );
  };

  return (
    <Grid {...styles.mainGridProps(showChatHistory, showDiscovery)}>
      {testRender()}
      {renderMoreChat()}
      {renderDiscoveryLibrary()}
      {renderCenterChatContent()}
      {renderCenterChatContentNoMessages()}
      {renderNewMessageIndicator()}
      {renderBottomChatContent()}
      {renderChatHistoryButton()}
      {renderChatHistory()}
    </Grid>
  );
};

export default ChatInterface;
