const styles = {
  chatHistoryProps: {
    sx: {
      padding: '0px',
    },
  },
  chatHistoryTimeframeContainerProps: {
    sx: {
      paddingBottom: '0px',
      paddingTop: '0.5rem',
    },
  },
  chatHistoryListItemProps: {
    sx: {
      paddingTop: '0px',
      paddingBottom: '0px',
    },
  },
  timeframeProps: {
    sx: {
      color: 'gray',
      textDecoration: 'none',
    },
  },
  chatHistoryContentProps: {
    sx: {
      display: 'flex',
      justifyContent: 'space-between',
      paddingTop: '0px',
      paddingBottom: '0px',
      paddingRight: '1rem',
    },
  },
  chatHistoryTextProps: {
    sx: {
      textTransform: 'none',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#2d2f33',
        color: '#ffffff',
      },
      flexGrow: 1,
      justifyContent: 'space-between',
      display: 'flex',
    },
  },
  timestampProps: {
    sx: {
      color: 'gray',
      fontSize: '0.6rem',
      paddingLeft: '1rem',
      whiteSpace: 'nowrap',
    },
  },
  historyTitleProps: {
    sx: {
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      fontSize: '0.8rem',
    },
  },
};

export default styles;
