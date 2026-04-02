const styles = theme => ({
    card: {
        width: 'min(920px, 94%)',
        marginLeft: 'auto',
        marginRight: 'auto',
        marginBottom: 20,
        borderRadius: 18,
    },
    hintCard: {
        width: 'min(760px, 94%)',
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
        backgroundColor: '#1e9f86',
        color: '#f5fffc',
        borderRadius: 12,
        textTransform: 'none',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: 14,
        paddingRight: 14,
        width: "auto",
        minWidth: 140,
    },

    stepHeader: {
        //textAlign: 'center',
        fontSize: 22,
        fontFamily: 'Space Grotesk, Outfit, sans-serif',
        marginTop: 0,
        marginLeft: 10
    },

    stepBody: {
        //textAlign: 'center',
        fontSize: 18,
        lineHeight: 1.7,
        marginTop: 10,
        marginBottom: 30,
        marginLeft: 10
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
        marginLeft: 0,
        marginRight: 0,
        marginTop: 10,
        textAlign: 'center',
        fontSize: 20,
        fontFamily: 'Space Grotesk, Outfit, sans-serif',
    },
    titleCard: {
        width: 'min(980px, 94%)',
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingBottom: 0,
        borderRadius: 18,
    },
    problemHeader: {
        fontSize: 28,
        marginTop: 0,
        fontFamily: 'Space Grotesk, Outfit, sans-serif',
    },
    problemBody: {
        fontSize: 18,
        lineHeight: 1.7,
        marginTop: 10,
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
