const styles = theme => ({
    card: {
        width: 'min(1120px, 96%)',
        marginLeft: 'auto',
        marginRight: 'auto',
        marginBottom: 24,
        borderRadius: 20,
    },
    hintCard: {
        width: 'min(900px, 96%)',
        marginLeft: 'auto',
        marginRight: 'auto',
        marginBottom: 20,
        borderRadius: 14,
    },
    bullet: {
        display: 'inline-block',
        margin: '0 2px',
        transform: 'scale(0.8)',
    },
    title: {
        fontSize: 14,
    },
    pos: {
        marginBottom: 12,
    },

    button: {
        background: 'linear-gradient(120deg, #1e9f86, #45c8ac)',
        color: '#f5fffc',
        borderRadius: 12,
        textTransform: 'none',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: 16,
        paddingRight: 16,
        boxShadow: '0 10px 22px rgba(22,124,103,0.24)',
        width: "auto",
        minWidth: 140,
        '&:hover': {
            boxShadow: '0 14px 26px rgba(22,124,103,0.28)',
            transform: 'translateY(-1px)',
        },
    },

    stepHeader: {
        fontSize: 24,
        fontFamily: 'Space Grotesk, Outfit, sans-serif',
        marginTop: 0,
        marginLeft: 0,
        marginBottom: 10,
        color: '#123a33',
    },

    stepBody: {
        fontSize: 18,
        lineHeight: 1.72,
        marginTop: 10,
        marginBottom: 26,
        marginLeft: 0,
        color: '#2d4f4a',
    },

    inputField: {
        width: '100%',
        textAlign: 'center',
        //marginLeft: '19em'

    },

    muiUsedHint: {
        borderWidth: '1px',
        borderColor: 'GoldenRod !important'
    },

    inputHintField: {
        width: '10em',
        //marginLeft: '16em',
    },

    center: {
        marginLeft: '19em',
        marginRight: '19em',
        marginTop: '1em'
    },

    checkImage: {
        width: '3em',
        marginLeft: '0.5em',
    },

    root: {
        flexGrow: 1,
    },

    paper: {
        padding: theme.spacing(3, 2),
    },

    // Problem
    prompt: {
        width: '100%',
        maxWidth: 1180,
        marginLeft: 'auto',
        marginRight: 'auto',
        marginTop: 10,
        textAlign: 'left',
        fontSize: 20,
        fontFamily: 'Space Grotesk, Outfit, sans-serif',
    },
    titleCard: {
        width: 'min(1120px, 96%)',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingBottom: 2,
        borderRadius: 22,
    },
    problemHeader: {
        fontSize: 36,
        marginTop: 0,
        marginBottom: 10,
        fontFamily: 'Space Grotesk, Outfit, sans-serif',
        lineHeight: 1.15,
        color: '#123a33',
    },
    problemBody: {
        fontSize: 18,
        lineHeight: 1.7,
        marginTop: 10,
        color: '#2f5b53',
    },
    problemStepHeader: {
        fontSize: 25,
        marginTop: 0,
        marginLeft: 10
    },
    problemStepBody: {
        fontSize: 20,
        marginTop: 10,
        marginLeft: 10
    },
    textBox: {
        paddingLeft: 70,
        paddingRight: 70,
    },
    textBoxHeader: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    textBoxLatex: {
        border: "1px solid #c4c4c4",
        borderRadius: "4px",
        '&:hover': {
            border: "1px solid #000000",
        },
        '&:focus-within': {
            border: "2px solid #3f51b5",
        },
        height: 50,
        width: '100%',
        '& > .mq-editable-field': {
            display: 'table',
            tableLayout: 'fixed'
        },
        '& > * > *[mathquill-block-id]': {
            height: 50,
            display: 'table-cell',
            paddingBottom: 5
        }
    },
    textBoxLatexIncorrect: {
        boxShadow: "0 0 0.75pt 0.75pt red",
        '&:focus-within': {
            border: "1px solid red",
        },
    },
    textBoxLatexUsedHint: {
        boxShadow: "0 0 0.75pt 0.75pt GoldenRod",
        '&:focus-within': {
            border: "1px solid GoldenRod",
        },
    }

});

export default styles;
